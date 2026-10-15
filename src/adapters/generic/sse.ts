import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { routeMcpRequest } from '../../core/mcp/router';
import { sanitizeLogString } from '../../core/logging/audit';

// Sesi aktif SSE yang disimpan di memori
const activeTransports = new Map<string, SSEServerTransport>();

export const getActiveTransportsCount = (): number => {
  return activeTransports.size;
};

export const clearActiveTransports = (): void => {
  for (const transport of activeTransports.values()) {
    try {
      transport.close();
    } catch {
      // Abaikan error saat cleanup
    }
  }
  activeTransports.clear();
};

export const handleSseConnection = async (
  req: express.Request,
  res: express.Response,
  allowedDrivers?: string[],
  userEmail: string = 'generic-agent@gateway.local'
): Promise<void> => {
  const safeEmail = sanitizeLogString(userEmail);
  console.log(`[Generic SSE] New SSE connection request from user: ${safeEmail}`);

  // Tentukan path endpoint POST messages yang sesuai dengan prefix mount saat ini
  const endpointPath = req.baseUrl ? `${req.baseUrl}/messages` : '/messages';

  const transport = new SSEServerTransport(endpointPath, res);
  const sessionId = transport.sessionId;

  activeTransports.set(sessionId, transport);
  console.log(`[Generic SSE] Session established: ${sessionId}`);

  transport.onmessage = async (message) => {
    try {
      const context = {
        userEmail,
        adapterName: 'generic',
        requestId: (message as any)?.id || 'unknown',
        timestamp: new Date().toISOString(),
        clientIp: req.ip,
      };
      const response = await routeMcpRequest(message as any, context, allowedDrivers);
      if (response !== null) {
        await transport.send(response as any);
      }
    } catch (err: any) {
      console.error(`[Generic SSE] Error routing message for session ${sessionId}:`, err.message);
    }
  };

  transport.onclose = () => {
    activeTransports.delete(sessionId);
    console.log(`[Generic SSE] Session closed: ${sessionId}`);
  };

  try {
    await transport.start();
  } catch (err: any) {
    activeTransports.delete(sessionId);
    console.error(`[Generic SSE] Failed to start transport for session ${sessionId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).end('Failed to initialize SSE stream');
    }
  }
};

export const handlePostMessages = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).send('Missing sessionId query parameter');
    return;
  }

  const transport = activeTransports.get(sessionId);

  if (!transport) {
    res.status(404).send(`Session "${sessionId}" not found or has expired`);
    return;
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (err: any) {
    console.error(`[Generic SSE] Error handling POST message for session ${sessionId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).send(`Error processing message: ${err.message}`);
    }
  }
};
