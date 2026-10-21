import { writeAuditLog } from '../logging/audit';
import { driverManager } from './driverManager';
import { ToolContext } from './context';
import { rateLimiter } from '../security/rateLimiter';
import { budgetManager } from '../security/budgetManager';

export interface McpRequest {
  jsonrpc: string;
  id?: any;
  method: string;
  params?: any;
}

export interface McpResponse {
  jsonrpc: string;
  id: any;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

const handleInitialize = (id: any, userEmail: string): McpResponse => {
  writeAuditLog({
    requestId: id,
    userEmail,
    toolName: 'initialize',
    status: 'SUCCESS',
  });
  return {
    jsonrpc: '2.0',
    id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'enterprise-mcp-gateway',
        version: '1.0.0',
      },
    },
  };
};

const handleToolsList = async (id: any, allowedDrivers?: string[]): Promise<McpResponse> => {
  const tools = await driverManager.getToolsList(allowedDrivers);
  return {
    jsonrpc: '2.0',
    id,
    result: {
      tools,
    },
  };
};

const handleToolsCall = async (
  id: any,
  context: ToolContext,
  params: any,
  allowedDrivers?: string[]
): Promise<McpResponse> => {
  const toolName = params?.name;
  const args = params?.arguments || {};
  const { userEmail, adapterName } = context;

  if (!toolName) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32602, message: 'Invalid Params: params.name is required' },
    };
  }

  // 1. Rate Limiting Check (Agnostic per user & adapter)
  const rateLimitKey = `${adapterName}:${userEmail}`;
  const rateLimitResult = rateLimiter.checkRateLimit(rateLimitKey);
  if (!rateLimitResult.allowed) {
    const retryAfterSec = Math.ceil(rateLimitResult.resetMs / 1000);
    const reason = `Rate limit exceeded: Too many requests for ${userEmail}. Try again in ${retryAfterSec}s.`;
    writeAuditLog({
      requestId: id,
      userEmail,
      toolName,
      status: 'REJECTED',
      denialReason: reason,
    });
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: reason },
    };
  }

  // 2. Budget Quota Pre-Check (if daily budget quota is configured)
  const budgetCheck = budgetManager.checkBudget(userEmail);
  if (!budgetCheck.allowed) {
    writeAuditLog({
      requestId: id,
      userEmail,
      toolName,
      status: 'REJECTED',
      denialReason: budgetCheck.reason,
    });
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: budgetCheck.reason! },
    };
  }

  // 3. Driver and Scoping Checks
  const driverName = driverManager.getDriverNameForTool(toolName);
  if (!driverName) {
    writeAuditLog({
      requestId: id,
      userEmail,
      toolName,
      status: 'FAILED',
      error: `Method not found: Tool "${toolName}" is not registered by any active driver.`,
    });
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: Tool "${toolName}" is not registered by any active driver.` },
    };
  }

  if (allowedDrivers && !allowedDrivers.includes(driverName)) {
    writeAuditLog({
      requestId: id,
      userEmail,
      toolName,
      status: 'REJECTED',
      denialReason: `Access Denied: You do not have permission to use tools from driver ${driverName}. Allowed drivers: ${allowedDrivers.join(', ')}`,
    });
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: `Access Denied: You do not have permission to use tools from driver ${driverName}.` },
    };
  }

  // 4. Execute Driver Tool with Context
  try {
    const result = await driverManager.callTool(toolName, args, context);
    
    let metadata: Record<string, any> | undefined = undefined;
    if (typeof result === 'object' && result !== null && '_audit' in result) {
      metadata = result._audit;
      delete result._audit;
    }

    // Record actual usage bytes reported by downstream driver into user budget
    if (metadata && typeof metadata.actualBytesBilled === 'number' && metadata.actualBytesBilled > 0) {
      budgetManager.recordUsage(userEmail, metadata.actualBytesBilled);
    } else if (metadata && typeof metadata.bytesProcessed === 'number' && metadata.bytesProcessed > 0) {
      budgetManager.recordUsage(userEmail, metadata.bytesProcessed);
    }

    // Assume the driver returns a native JS/TS object; format as JSON string if not already a string.
    const formattedResult = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

    writeAuditLog({
      requestId: id,
      userEmail,
      toolName,
      status: 'SUCCESS',
      metadata,
    });
    
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: formattedResult }],
      },
    };
  } catch (err: any) {

    writeAuditLog({
      requestId: id,
      userEmail,
      toolName,
      status: 'FAILED',
      error: err.message,
    });
    
    if (err.message.includes('Method not found:')) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: err.message },
      };
    }
    
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      },
    };
  }
};

export const routeMcpRequest = async (
  request: McpRequest,
  contextOrEmail: ToolContext | string,
  allowedDrivers?: string[]
): Promise<McpResponse | null> => {
  const { jsonrpc, id, method, params } = request;

  if (jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' } };
  }

  const context: ToolContext = typeof contextOrEmail === 'string'
    ? {
        userEmail: contextOrEmail,
        adapterName: 'unknown',
        requestId: id || 'unknown',
        timestamp: new Date().toISOString(),
      }
    : contextOrEmail;

  try {
    switch (method) {
      case 'initialize':
        return handleInitialize(id, context.userEmail);

      case 'notifications/initialized':
        // Notifications don't have responses
        return null;

      case 'tools/list':
        return await handleToolsList(id, allowedDrivers);

      case 'tools/call':
        return await handleToolsCall(id, context, params, allowedDrivers);

      default: {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: "${method}"` },
        };
      }
    }
  } catch (err: any) {
    console.error('MCP Router Exception:', err);
    return {
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32603, message: `Internal server error: ${err.message}` },
    };
  }
};
