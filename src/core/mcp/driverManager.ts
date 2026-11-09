import { McpDriver } from './driver';
import { ToolContext } from './context';
import { StdioDriver } from '../../drivers/stdioDriver';
import { SseDriver } from '../../drivers/sseDriver';
import { gatewayConfig } from '../../config/gateway.config';
import { OutboundDriverConfig } from '../../config/types';
import { auditEmitter } from '../logging/audit';

export interface DriverStatusInfo {
  name: string;
  type: 'stdio' | 'sse';
  status: 'CONNECTED' | 'CONNECTING' | 'ERROR' | 'STOPPED';
  toolCount: number;
  tools: string[];
  connectedAt?: string;
  lastError?: string;
  timeoutMs?: number;
  commandOrUrl?: string;
}

export class DriverManager {
  private drivers: Map<string, McpDriver> = new Map();
  private driverStates: Map<string, DriverStatusInfo> = new Map();
  // Map of toolName to its owning driver name
  private toolRegistry: Map<string, string> = new Map();
  
  // Store aggregated tool metadata
  private cachedToolsList: any[] = [];

  private parseTimeout(driverConfig: OutboundDriverConfig): number | undefined {
    return typeof driverConfig.timeoutMs === 'number'
      ? driverConfig.timeoutMs
      : typeof driverConfig.timeout === 'string'
        ? (driverConfig.timeout.endsWith('ms')
            ? parseInt(driverConfig.timeout, 10)
            : driverConfig.timeout.endsWith('s')
              ? parseInt(driverConfig.timeout, 10) * 1000
              : parseInt(driverConfig.timeout, 10) || undefined)
        : typeof driverConfig.timeout === 'number'
          ? driverConfig.timeout
          : undefined;
  }

  private createDriverInstance(driverName: string, driverConfig: OutboundDriverConfig): McpDriver {
    const prefix = `${driverName}_`;
    const timeoutMs = this.parseTimeout(driverConfig);

    switch (driverConfig.type) {
      case 'stdio':
        if (!driverConfig.command) {
          throw new Error(`Driver ${driverName} of type stdio missing command`);
        }
        return new StdioDriver({
          name: driverName,
          prefix,
          command: driverConfig.command,
          args: driverConfig.args || [],
          env: {
            ...process.env,
            ...(driverConfig.env || {})
          },
          timeoutMs
        });
      case 'sse':
        if (!driverConfig.url) {
          throw new Error(`Driver ${driverName} of type sse missing url`);
        }
        return new SseDriver({
          name: driverName,
          prefix,
          url: driverConfig.url,
          headers: driverConfig.headers,
          timeoutMs
        });
      default:
        throw new Error(`Unknown driver type for ${driverName}`);
    }
  }

  async initialize(): Promise<void> {
    const config = gatewayConfig;
    if (!config || !config.outboundDrivers) {
      console.warn('[DriverManager] No outbound drivers configured.');
      return;
    }

    // Initialize all configured drivers concurrently so startup is non-blocking
    const initPromises = Object.entries(config.outboundDrivers).map(async ([driverName, driverConfig]) => {
      const commandOrUrl = driverConfig.type === 'stdio'
        ? `${driverConfig.command || ''} ${(driverConfig.args || []).join(' ')}`.trim()
        : driverConfig.url;

      // Handle disabled drivers
      if (driverConfig.enabled === false) {
        const stoppedState: DriverStatusInfo = {
          name: driverName,
          type: driverConfig.type,
          status: 'STOPPED',
          toolCount: 0,
          tools: [],
          timeoutMs: this.parseTimeout(driverConfig),
          commandOrUrl,
        };
        this.driverStates.set(driverName, stoppedState);
        auditEmitter.emit('driver_status', stoppedState);
        return;
      }

      const connectingState: DriverStatusInfo = {
        name: driverName,
        type: driverConfig.type,
        status: 'CONNECTING',
        toolCount: 0,
        tools: [],
        timeoutMs: this.parseTimeout(driverConfig),
        commandOrUrl,
      };
      this.driverStates.set(driverName, connectingState);
      auditEmitter.emit('driver_status', connectingState);

      let driver: McpDriver;
      try {
        driver = this.createDriverInstance(driverName, driverConfig);
      } catch (err: any) {
        console.error(`[DriverManager] Driver config error for ${driverName}:`, err.message);
        const errState: DriverStatusInfo = {
          name: driverName,
          type: driverConfig.type,
          status: 'ERROR',
          toolCount: 0,
          tools: [],
          lastError: err.message,
          commandOrUrl,
        };
        this.driverStates.set(driverName, errState);
        auditEmitter.emit('driver_status', errState);
        return;
      }

      try {
        await driver.initialize();
        this.drivers.set(driverName, driver);
        const connectedState: DriverStatusInfo = {
          name: driverName,
          type: driverConfig.type,
          status: 'CONNECTED',
          toolCount: 0,
          tools: [],
          connectedAt: new Date().toISOString(),
          timeoutMs: this.parseTimeout(driverConfig),
          commandOrUrl,
        };
        this.driverStates.set(driverName, connectedState);
        auditEmitter.emit('driver_status', connectedState);
        console.log(`[DriverManager] Initialized driver: ${driverName}`);
      } catch (err: any) {
        console.error(`[DriverManager] Failed to initialize driver ${driverName}:`, err.message);
        const errState: DriverStatusInfo = {
          name: driverName,
          type: driverConfig.type,
          status: 'ERROR',
          toolCount: 0,
          tools: [],
          lastError: err.message,
          timeoutMs: this.parseTimeout(driverConfig),
          commandOrUrl,
        };
        this.driverStates.set(driverName, errState);
        auditEmitter.emit('driver_status', errState);
      }
    });

    await Promise.allSettled(initPromises);
    await this.aggregateTools();
  }

  private async aggregateTools(): Promise<void> {
    this.cachedToolsList = [];
    this.toolRegistry.clear();

    for (const [driverName, driver] of this.drivers.entries()) {
      try {
        const tools = await driver.listTools();
        const toolNames: string[] = [];
        
        for (const tool of tools) {
          // Namespace tool name if the driver has a configured prefix
          const namespacedName = driver.prefix ? `${driver.prefix}${tool.name}` : tool.name;
          
          this.cachedToolsList.push({
            ...tool,
            name: namespacedName,
          });

          this.toolRegistry.set(namespacedName, driverName);
          toolNames.push(namespacedName);
        }

        const state = this.driverStates.get(driverName);
        if (state) {
          state.toolCount = toolNames.length;
          state.tools = toolNames;
        }
      } catch (err: any) {
        console.error(`[DriverManager] Failed to fetch tools from driver ${driverName}:`, err.message);
        const state = this.driverStates.get(driverName);
        if (state) {
          state.status = 'ERROR';
          state.lastError = err.message;
        }
      }
    }
  }

  /**
   * Retrieves comprehensive status list for all configured drivers
   */
  getDriversStatus(): DriverStatusInfo[] {
    return Array.from(this.driverStates.values());
  }

  getDriverStatus(driverName: string): DriverStatusInfo | undefined {
    return this.driverStates.get(driverName);
  }

  /**
   * Hot-reloads or installs a single driver at runtime without restarting the gateway
   */
  async upsertAndReloadDriver(driverName: string, driverConfig: OutboundDriverConfig): Promise<DriverStatusInfo> {
    const commandOrUrl = driverConfig.type === 'stdio'
      ? `${driverConfig.command || ''} ${(driverConfig.args || []).join(' ')}`.trim()
      : driverConfig.url;

    // 1. Gracefully shutdown existing driver if running
    const existing = this.drivers.get(driverName);
    if (existing) {
      try {
        await existing.shutdown();
      } catch (e: any) {
        console.warn(`[DriverManager] Error shutting down previous instance of ${driverName}:`, e.message);
      }
      this.drivers.delete(driverName);
    }

    // 2. If disabled, mark STOPPED
    if (driverConfig.enabled === false) {
      const stoppedState: DriverStatusInfo = {
        name: driverName,
        type: driverConfig.type,
        status: 'STOPPED',
        toolCount: 0,
        tools: [],
        timeoutMs: this.parseTimeout(driverConfig),
        commandOrUrl,
      };
      this.driverStates.set(driverName, stoppedState);
      await this.aggregateTools();
      auditEmitter.emit('driver_status', stoppedState);
      return stoppedState;
    }

    // 3. Create and initialize new driver
    let newDriver: McpDriver;
    try {
      newDriver = this.createDriverInstance(driverName, driverConfig);
    } catch (err: any) {
      const errorState: DriverStatusInfo = {
        name: driverName,
        type: driverConfig.type,
        status: 'ERROR',
        toolCount: 0,
        tools: [],
        lastError: err.message,
        commandOrUrl,
      };
      this.driverStates.set(driverName, errorState);
      auditEmitter.emit('driver_status', errorState);
      throw err;
    }

    try {
      await newDriver.initialize();
      this.drivers.set(driverName, newDriver);

      const connectedState: DriverStatusInfo = {
        name: driverName,
        type: driverConfig.type,
        status: 'CONNECTED',
        toolCount: 0,
        tools: [],
        connectedAt: new Date().toISOString(),
        timeoutMs: this.parseTimeout(driverConfig),
        commandOrUrl,
      };
      this.driverStates.set(driverName, connectedState);

      await this.aggregateTools();
      auditEmitter.emit('driver_status', this.driverStates.get(driverName)!);
      return this.driverStates.get(driverName)!;
    } catch (err: any) {
      const errorState: DriverStatusInfo = {
        name: driverName,
        type: driverConfig.type,
        status: 'ERROR',
        toolCount: 0,
        tools: [],
        lastError: err.message,
        timeoutMs: this.parseTimeout(driverConfig),
        commandOrUrl,
      };
      this.driverStates.set(driverName, errorState);
      await this.aggregateTools();
      auditEmitter.emit('driver_status', errorState);
      throw err;
    }
  }

  /**
   * Gracefully stops a driver and un-registers its tools
   */
  async stopDriver(driverName: string): Promise<DriverStatusInfo> {
    const existing = this.drivers.get(driverName);
    if (existing) {
      try {
        await existing.shutdown();
      } catch (e: any) {
        console.warn(`[DriverManager] Error shutting down driver ${driverName}:`, e.message);
      }
      this.drivers.delete(driverName);
    }

    const currentState = this.driverStates.get(driverName);
    const stoppedState: DriverStatusInfo = {
      name: driverName,
      type: currentState?.type || 'stdio',
      status: 'STOPPED',
      toolCount: 0,
      tools: [],
      commandOrUrl: currentState?.commandOrUrl,
      timeoutMs: currentState?.timeoutMs,
    };
    this.driverStates.set(driverName, stoppedState);
    await this.aggregateTools();
    auditEmitter.emit('driver_status', stoppedState);
    return stoppedState;
  }

  /**
   * Starts all enabled drivers concurrently
   */
  async startAllEnabled(): Promise<DriverStatusInfo[]> {
    const config = gatewayConfig;
    if (!config || !config.outboundDrivers) return [];

    const promises = Object.entries(config.outboundDrivers)
      .filter(([_, driverConfig]) => driverConfig.enabled !== false)
      .map(([name, driverConfig]) => this.upsertAndReloadDriver(name, driverConfig).catch(() => this.getDriverStatus(name)!));

    await Promise.allSettled(promises);
    return this.getDriversStatus();
  }

  /**
   * Gracefully stops all active drivers
   */
  async stopAll(): Promise<DriverStatusInfo[]> {
    const promises = Array.from(this.driverStates.keys()).map((name) => this.stopDriver(name));
    await Promise.allSettled(promises);
    return this.getDriversStatus();
  }

  /**
   * Completely removes a driver from the runtime registry
   */
  async removeDriver(driverName: string): Promise<void> {
    const existing = this.drivers.get(driverName);
    if (existing) {
      try {
        await existing.shutdown();
      } catch (e: any) {
        console.warn(`[DriverManager] Error shutting down driver ${driverName}:`, e.message);
      }
      this.drivers.delete(driverName);
    }
    this.driverStates.delete(driverName);
    await this.aggregateTools();
  }

  async getToolsList(allowedDrivers?: string[]): Promise<any[]> {
    if (allowedDrivers) {
      return this.cachedToolsList.filter(tool => {
        const driverName = this.toolRegistry.get(tool.name);
        return driverName && allowedDrivers.includes(driverName);
      });
    }
    return this.cachedToolsList;
  }

  getDriverNameForTool(namespacedName: string): string | undefined {
    return this.toolRegistry.get(namespacedName);
  }

  async callTool(namespacedName: string, args: any, context?: ToolContext): Promise<any> {
    const driverName = this.toolRegistry.get(namespacedName);
    
    if (!driverName) {
      throw new Error(`Method not found: Tool "${namespacedName}" is not registered by any active driver.`);
    }

    const driver = this.drivers.get(driverName);
    if (!driver) {
      throw new Error(`Driver ${driverName} is not active.`);
    }

    // Strip namespace prefix before forwarding tool call downstream
    let originalName = namespacedName;
    if (driver.prefix && namespacedName.startsWith(driver.prefix)) {
      originalName = namespacedName.substring(driver.prefix.length);
    }

    if (context !== undefined) {
      return await driver.callTool(originalName, args, context);
    }
    return await driver.callTool(originalName, args);
  }

  async shutdown(): Promise<void> {
    for (const driver of this.drivers.values()) {
      try {
        await driver.shutdown();
      } catch (e: any) {
        console.error(`[DriverManager] Error shutting down driver ${driver.name}:`, e.message);
      }
    }
  }
}

// Export singleton instance for router usage
export const driverManager = new DriverManager();
