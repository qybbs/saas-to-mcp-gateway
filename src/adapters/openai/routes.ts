import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { gatewayConfig } from '../../config/gateway.config';
import { routeMcpRequest, McpRequest } from '../../core/mcp/router';
import { generateOpenApiSpec } from './openapiGenerator';

const router = Router();

/**
 * Authentication middleware for OpenAI Action adapter.
 * Supports Bearer token and X-API-Key header.
 */
export const authenticateOpenAi = (req: Request, res: Response, next: NextFunction): void => {
  const configuredKey = gatewayConfig?.inboundAdapters?.openai?.apiKey || process.env.OPENAI_ADAPTER_API_KEY;
  
  // If no API key is configured, pass through (e.g. in Personal/Dev Mode)
  if (!configuredKey) {
    return next();
  }

  const authHeader = req.header('Authorization');
  let providedKey = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7).trim();
  } else if (req.header('X-API-Key')) {
    providedKey = (req.header('X-API-Key') as string).trim();
  }

  if (!providedKey || providedKey !== configuredKey) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key.' });
    return;
  }

  next();
};

/**
 * Health check endpoint for OpenAI adapter
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', adapter: 'openai' });
});

/**
 * Dynamic OpenAPI 3.1.0 specification endpoint
 */
router.get('/openapi.json', async (req: Request, res: Response) => {
  try {
    const configuredKey = gatewayConfig?.inboundAdapters?.openai?.apiKey || process.env.OPENAI_ADAPTER_API_KEY;
    const allowedDrivers = gatewayConfig?.inboundAdapters?.openai?.allowedDrivers;

    // Parse query params for filtering
    const driversQuery = typeof req.query.drivers === 'string' ? req.query.drivers : undefined;
    const toolsQuery = typeof req.query.tools === 'string' ? req.query.tools : undefined;

    const filterDrivers = driversQuery ? driversQuery.split(',').map(d => d.trim()).filter(Boolean) : undefined;
    const filterTools = toolsQuery ? toolsQuery.split(',').map(t => t.trim()).filter(Boolean) : undefined;

    // Resolve server base URL
    const publicUrl = process.env.GATEWAY_PUBLIC_URL;
    const serverBaseUrl = publicUrl 
      ? `${publicUrl.replace(/\/$/, '')}/openai`
      : `${req.protocol}://${req.get('host')}/openai`;

    const spec = await generateOpenApiSpec({
      allowedDrivers,
      filterDrivers,
      filterTools,
      serverBaseUrl,
      requireAuth: Boolean(configuredKey),
      title: 'Enterprise SaaS-to-MCP Gateway - OpenAI Actions',
      version: '1.1.0',
    });

    res.json(spec);
  } catch (err: any) {
    console.error('[OpenAI Adapter] Failed to generate OpenAPI specification:', err);
    res.status(500).json({ error: `Failed to generate OpenAPI spec: ${err.message}` });
  }
});

/**
 * Action execution endpoint: POST /openai/tools/:toolName
 */
router.post('/tools/:toolName', authenticateOpenAi, async (req: Request, res: Response): Promise<void> => {
  const { toolName } = req.params;
  const userEmail = (req.headers['x-user-email'] as string) || process.env.LOCAL_USER_EMAIL || 'openai-user@gateway.local';
  const allowedDrivers = gatewayConfig?.inboundAdapters?.openai?.allowedDrivers;
  const requestId = (req.headers['x-request-id'] as string) || `openai-${crypto.randomUUID()}`;

  const mcpRequest: McpRequest = {
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: req.body && typeof req.body === 'object' ? req.body : {},
    },
  };

  const context = {
    userEmail,
    adapterName: 'openai',
    requestId,
    timestamp: new Date().toISOString(),
    clientIp: req.ip,
  };

  try {
    const mcpResponse = await routeMcpRequest(mcpRequest, context, allowedDrivers);

    if (!mcpResponse) {
      res.status(204).end();
      return;
    }

    if (mcpResponse.error) {
      const { code, message } = mcpResponse.error;
      let statusCode = 500;

      if (code === -32000) {
        if (message.includes('Rate limit exceeded')) {
          statusCode = 429;
        } else if (message.includes('Access Denied') || message.includes('Daily query budget exceeded')) {
          statusCode = 403;
        } else {
          statusCode = 400;
        }
      } else if (code === -32601) {
        statusCode = 404; // Tool not found
      } else if (code === -32602) {
        statusCode = 400; // Invalid params
      }

      res.status(statusCode).json({ error: message });
      return;
    }

    if (mcpResponse.result?.isError) {
      const errorMessage = mcpResponse.result?.content?.[0]?.text || 'Tool execution failed';
      const statusCode = errorMessage.startsWith('Rejected:') || errorMessage.includes('Policy rejection') || errorMessage.includes('forbidden') ? 400 : 500;
      res.status(statusCode).json({ error: errorMessage });
      return;
    }

    const contentText = mcpResponse.result?.content?.[0]?.text;
    let data: any = contentText;

    if (typeof contentText === 'string') {
      try {
        data = JSON.parse(contentText);
      } catch {
        data = contentText;
      }
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error(`[OpenAI Adapter] Execution error for tool ${toolName}:`, err);
    res.status(500).json({ error: `Internal execution error: ${err.message}` });
  }
});

export default router;
