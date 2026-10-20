import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { handleSseConnection, handlePostMessages } from './sse';
import { routeMcpRequest } from '../../core/mcp/router';
import { gatewayConfig } from '../../config/gateway.config';
import { sanitizeLogString } from '../../core/logging/audit';

export const genericRouter = Router();

/**
 * Middleware for optional API Key validation on the generic adapter
 */
export const authenticateGeneric = (req: Request, res: Response, next: NextFunction) => {
  const adapterConfig = gatewayConfig?.inboundAdapters?.generic;
  const expectedApiKey = adapterConfig?.apiKey;

  // If API Key is configured and non-empty, require authentication
  if (expectedApiKey && expectedApiKey.trim() !== '') {
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers['x-api-key'];

    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : null;
    const providedKey = bearerToken || (typeof xApiKey === 'string' ? xApiKey.trim() : null);

    if (!providedKey || providedKey !== expectedApiKey.trim()) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized: Invalid or missing API Key' }
      });
    }
  }

  next();
};

/**
 * Helper handler for Direct JSON-RPC POST (e.g., /mcp)
 */
export const handleDirectMcpRequest = async (req: Request, res: Response) => {
  const adapterConfig = gatewayConfig?.inboundAdapters?.generic;
  const allowedDrivers = adapterConfig?.allowedDrivers;
  const defaultEmail = process.env.LOCAL_USER_EMAIL || 'developer@localhost';
  const userEmail = (req.headers['x-user-email'] as string) || defaultEmail;

  // Set / echo mcp-session-id header for MCP HTTP Streamable clients (e.g. Antigravity IDE)
  const sessionId = (req.headers['mcp-session-id'] as string) || (req.query.sessionId as string) || crypto.randomUUID();
  res.setHeader('mcp-session-id', sessionId);
  res.setHeader('Mcp-Session-Id', sessionId);

  const { jsonrpc, id, method, params } = req.body || {};

  const safeEmail = sanitizeLogString(userEmail);
  const safeMethod = sanitizeLogString(method);
  const safeId = sanitizeLogString(id);
  console.log(`[Generic HTTP] User: ${safeEmail} | Method: ${safeMethod} | ID: ${safeId}`);

  const context = {
    userEmail,
    adapterName: 'generic',
    requestId: id || 'unknown',
    timestamp: new Date().toISOString(),
    clientIp: req.ip,
  };

  const mcpResponse = await routeMcpRequest({ jsonrpc, id, method, params }, context, allowedDrivers);

  if (mcpResponse === null) {
    return res.status(202).end();
  }

  let statusCode = 200;
  if (mcpResponse.error) {
    if (mcpResponse.error.code === -32000) statusCode = 403; // Access Denied
    else if (mcpResponse.error.code === -32600) statusCode = 400; // Invalid Request
    else if (mcpResponse.error.code === -32601) statusCode = 404; // Method not found
    else if (mcpResponse.error.code === -32602) statusCode = 400; // Invalid params
    else if (mcpResponse.error.code === -32603) statusCode = 500; // Internal error
  }

  return res.status(statusCode).json(mcpResponse);
};

// Route definitions under router
genericRouter.use(authenticateGeneric);

// 1. Standard MCP SSE Transport Endpoints
genericRouter.get('/sse', (req, res) => {
  const adapterConfig = gatewayConfig?.inboundAdapters?.generic;
  const allowedDrivers = adapterConfig?.allowedDrivers;
  const userEmail = (req.headers['x-user-email'] as string) || 'generic-agent@gateway.local';
  handleSseConnection(req, res, allowedDrivers, userEmail);
});

genericRouter.post('/sse', (req, res) => {
  if (req.query.sessionId) {
    return handlePostMessages(req, res);
  }
  return handleDirectMcpRequest(req, res);
});

genericRouter.post('/messages', handlePostMessages);

// 2. Direct HTTP JSON-RPC Endpoints (Stateless / curl / simple agents)
genericRouter.post('/mcp', handleDirectMcpRequest);
genericRouter.post('/', handleDirectMcpRequest);

// 3. Health & Discovery Pings
genericRouter.get('/health', (req, res) => res.json({ status: 'ok', adapter: 'generic' }));
genericRouter.get('/', (req, res) => res.json({ status: 'ok', adapter: 'generic' }));

export default genericRouter;
