import { ChildProcess, spawn } from 'child_process';
import { createInterface } from 'readline';
import { McpDriver } from '../core/mcp/driver';

export class StdioDriver implements McpDriver {
  name: string;
  prefix: string;
  private command: string;
  private args: string[];
  private env: NodeJS.ProcessEnv | undefined;

  private process: ChildProcess | null = null;
  private messageCounter = 0;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private handshake: boolean;
  private timeoutMs: number;
  
  // This will store the cached tools from the downstream server
  private cachedTools: any[] | null = null;

  constructor(config: {
    name: string;
    prefix: string;
    command: string;
    args?: string[];
    env?: Record<string, string | undefined>;
    handshake?: boolean;
    timeoutMs?: number;
  }) {
    this.name = config.name;
    this.prefix = config.prefix;
    this.command = config.command;
    this.args = config.args || [];
    this.env = config.env;
    this.handshake = config.handshake ?? true;
    this.timeoutMs = config.timeoutMs ?? (process.env.MCP_DRIVER_TIMEOUT_MS ? parseInt(process.env.MCP_DRIVER_TIMEOUT_MS, 10) : 15000);
  }

  async initialize(): Promise<void> {
    if (!this.command) {
      throw new Error(`Command is required to initialize StdioDriver for ${this.name}`);
    }

    this.process = spawn(this.command, this.args, {
      stdio: ['pipe', 'pipe', 'inherit'], // pass stderr to main process
      env: this.env
    });

    this.process.on('error', (err) => {
      console.error('[StdioDriver] Process error:', err);
      this.rejectAllPending(err);
    });

    this.process.on('exit', (code) => {
      console.warn(`[StdioDriver] Process exited with code ${code}`);
      this.rejectAllPending(new Error(`Downstream process exited with code ${code}`));
      this.process = null;
    });

    if (this.process.stdout) {
      const rl = createInterface({
        input: this.process.stdout,
        crlfDelay: Number.POSITIVE_INFINITY
      });

      rl.on('line', (line) => {
        if (!line.trim()) return;
        try {
          const message = JSON.parse(line);
          this.handleIncomingMessage(message);
        } catch (e: any) {
          console.error('[StdioDriver] Failed to parse message from downstream:', e.message, 'Line:', line);
        }
      });
    }

    // Perform standard MCP handshake before fetching tools
    if (this.handshake) {
      await this.performHandshake();
    }

    // Attempt to fetch tools to verify connection and cache them
    await this.fetchToolsFromDownstream();
  }

  private async performHandshake(): Promise<void> {
    try {
      await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'saas-mcp-gateway',
          version: '1.0.0'
        }
      });

      if (this.process && this.process.stdin) {
        const notif = JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
          params: {}
        }) + '\n';
        this.process.stdin.write(notif, () => {});
      }
    } catch (err: any) {
      console.warn(`[StdioDriver] Optional initialize handshake skipped for ${this.name}: ${err.message}`);
    }
  }

  private handleIncomingMessage(message: any) {
    if (message.jsonrpc !== '2.0') return;

    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message || 'Downstream JSON-RPC Error'));
      } else {
        resolve(message.result);
      }
    }
  }

  private rejectAllPending(error: Error) {
    for (const [id, req] of this.pendingRequests.entries()) {
      req.reject(error);
      this.pendingRequests.delete(id);
    }
  }

  private sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      return Promise.reject(new Error('Stdio process is not running.'));
    }

    const id = ++this.messageCounter;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params: params || {}
    };

    return new Promise((resolve, reject) => {
      const timeoutMs = this.timeoutMs;
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          const timeoutStr = timeoutMs >= 1000 ? `${Math.round(timeoutMs / 1000)}s` : `${timeoutMs}ms`;
          reject(new Error(`[StdioDriver] Request ${method} (id=${id}) timed out after ${timeoutStr}`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        }
      });
      const payload = JSON.stringify(request) + '\n';
      
      this.process!.stdin!.write(payload, (error) => {
        if (error) {
          clearTimeout(timer);
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  private async fetchToolsFromDownstream(): Promise<void> {
    const result = await this.sendRequest('tools/list');
    this.cachedTools = result.tools || [];
  }

  async listTools(): Promise<any[]> {
    if (!this.cachedTools) {
      await this.fetchToolsFromDownstream();
    }
    return this.cachedTools!;
  }

  async callTool(name: string, args: any, context?: any): Promise<any> {
    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args
    });
    
    // Convert to plain object if downstream wrapped it in MCP Response format
    if (result.isError) {
      throw new Error(result.content?.[0]?.text || 'Downstream tool execution failed');
    }
    
    // Depending on downstream protocol, result could be the actual object or wrapped in `content`.
    // We will extract text or JSON if it is wrapped.
    if (result.content && Array.isArray(result.content)) {
      const text = result.content[0]?.text;
      try {
        return JSON.parse(text); // If downstream returns JSON string
      } catch {
        return text; // Return as plain string
      }
    }
    
    return result;
  }

  async shutdown(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.rejectAllPending(new Error('Driver is shutting down'));
  }
}
