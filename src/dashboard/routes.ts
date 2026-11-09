import { Router, Request, Response, NextFunction } from 'express';
import {
  gatewayConfig,
  getRawGatewayConfig,
  saveRawGatewayConfig,
  upsertEnvVariables,
} from '../config/gateway.config';
import { OutboundDriverConfig } from '../config/types';
import { driverManager } from '../core/mcp/driverManager';
import {
  writeAuditLog,
  getAuditHistory,
  clearAuditHistory,
  getGatewayMetrics,
  auditEmitter,
} from '../core/logging/audit';
import { rateLimiter } from '../core/security/rateLimiter';
import { budgetManager } from '../core/security/budgetManager';
import { routeMcpRequest } from '../core/mcp/router';
import { MCP_MARKETPLACE_CATALOG } from './catalog';
import { getActiveTransportsCount } from '../adapters/generic/sse';

export const adminRouter = Router();

/**
 * Dual-Mode Admin Authentication Middleware
 * If ADMIN_API_KEY is not set or empty -> Personal Mode (zero-friction allow)
 * If ADMIN_API_KEY is set -> require valid key via Header or Query param (for EventSource)
 */
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const expectedKey = process.env.ADMIN_API_KEY?.trim();

  // Personal Mode: No admin key set
  if (!expectedKey) {
    return next();
  }

  // Enterprise Mode: Check header or query parameter
  const headerKey = req.headers['x-admin-key'];
  const authHeader = req.headers.authorization;
  const queryKey = req.query.adminKey as string | undefined;

  let providedKey: string | null = null;
  if (typeof headerKey === 'string' && headerKey.trim()) {
    providedKey = headerKey.trim();
  } else if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7).trim();
  } else if (queryKey && queryKey.trim()) {
    providedKey = queryKey.trim();
  }

  if (providedKey === expectedKey) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized: Invalid or missing Admin API Key',
    authRequired: true,
  });
};

adminRouter.use(authenticateAdmin);

/**
 * 1. Auth Status
 */
adminRouter.get('/auth-status', (req: Request, res: Response) => {
  const expectedKey = process.env.ADMIN_API_KEY?.trim();
  res.json({
    authRequired: Boolean(expectedKey),
    authenticated: true,
    mode: expectedKey ? 'Enterprise Governance' : 'Personal Hub',
  });
});

/**
 * 2. Gateway Overview & System State
 */
adminRouter.get('/overview', (req: Request, res: Response) => {
  const driversStatus = driverManager.getDriversStatus();
  const rawConfig = getRawGatewayConfig();
  const metrics = getGatewayMetrics();
  const activeDriversCount = driversStatus.filter((d) => d.status === 'CONNECTED').length;
  const totalTools = driversStatus.reduce((acc, curr) => acc + (curr.toolCount || 0), 0);

  res.json({
    service: 'Enterprise SaaS-to-MCP Gateway',
    version: '1.1.0',
    mode: process.env.ADMIN_API_KEY?.trim() ? 'Enterprise Governance' : 'Personal Hub',
    uptimeSeconds: metrics.uptimeSeconds,
    totalTools,
    activeDriversCount,
    totalDriversCount: Object.keys(rawConfig.outboundDrivers || {}).length,
    activeSseTransports: getActiveTransportsCount(),
    drivers: driversStatus,
    inboundAdapters: rawConfig.inboundAdapters,
    metrics,
    governance: {
      rateLimiter: rateLimiter.getConfig(),
      budgetManager: budgetManager.getConfig(),
    },
  });
});

/**
 * 3. Real-time Server-Sent Events (SSE) Stream
 */
adminRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial handshake event
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);

  // Event handlers
  const onAuditLog = (log: any) => {
    res.write(`event: audit_log\ndata: ${JSON.stringify(log)}\n\n`);
  };

  const onDriverStatus = (status: any) => {
    res.write(`event: driver_status\ndata: ${JSON.stringify(status)}\n\n`);
  };

  auditEmitter.on('audit_log', onAuditLog);
  auditEmitter.on('driver_status', onDriverStatus);

  // Send periodic metrics heartbeat every 5 seconds
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(`event: metrics\ndata: ${JSON.stringify(getGatewayMetrics())}\n\n`);
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 5000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    auditEmitter.off('audit_log', onAuditLog);
    auditEmitter.off('driver_status', onDriverStatus);
  });
});

/**
 * 4. Audit Logs (Ring Buffer)
 */
adminRouter.get('/logs', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  res.json({
    logs: getAuditHistory(limit),
    metrics: getGatewayMetrics(),
  });
});

adminRouter.delete('/logs', (req: Request, res: Response) => {
  clearAuditHistory();
  res.json({ success: true, message: 'Audit history cleared' });
});

/**
 * 5. Drivers Management
 */
adminRouter.get('/drivers', (req: Request, res: Response) => {
  const rawConfig = getRawGatewayConfig();
  const runtimeStatuses = driverManager.getDriversStatus();
  const statusMap = new Map(runtimeStatuses.map((s) => [s.name, s]));

  const driversList = Object.entries(rawConfig.outboundDrivers || {}).map(([name, config]) => {
    const status = statusMap.get(name);
    return {
      name,
      config,
      status: status || {
        name,
        type: config.type,
        status: config.enabled === false ? 'STOPPED' : 'CONNECTING',
        toolCount: 0,
        tools: [],
      },
    };
  });

  res.json(driversList);
});

adminRouter.post('/drivers/:name', async (req: Request, res: Response) => {
  const driverName = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
  const { config, envSecrets } = req.body as {
    config: OutboundDriverConfig;
    envSecrets?: Record<string, string>;
  };

  if (!config || !config.type) {
    return res.status(400).json({ error: 'Driver config with "type" is required.' });
  }

  try {
    // 1. Write any new secret variables to .env and process.env
    if (envSecrets && Object.keys(envSecrets).length > 0) {
      upsertEnvVariables(envSecrets);
    }

    // 2. Update raw gateway config preserving ${VAR} templates
    const rawConfig = getRawGatewayConfig();
    rawConfig.outboundDrivers[driverName] = {
      ...config,
      enabled: config.enabled !== false,
    };
    saveRawGatewayConfig(rawConfig);

    // 3. Hot-reload the driver in DriverManager
    const resolvedConfig = gatewayConfig?.outboundDrivers[driverName] || config;
    const updatedStatus = await driverManager.upsertAndReloadDriver(driverName, resolvedConfig);

    return res.json({
      success: true,
      driverName,
      status: updatedStatus,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: `Failed to configure driver ${driverName}: ${err.message}`,
      status: driverManager.getDriverStatus(driverName),
    });
  }
});

adminRouter.post('/drivers/actions/start-all', async (req: Request, res: Response) => {
  try {
    const statuses = await driverManager.startAllEnabled();
    res.json({ success: true, drivers: statuses });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to start all drivers: ${err.message}` });
  }
});

adminRouter.post('/drivers/actions/stop-all', async (req: Request, res: Response) => {
  try {
    const statuses = await driverManager.stopAll();
    res.json({ success: true, drivers: statuses });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to stop all drivers: ${err.message}` });
  }
});

adminRouter.post('/drivers/:name/restart', async (req: Request, res: Response) => {
  const driverName = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
  const resolvedConfig = gatewayConfig?.outboundDrivers[driverName];

  if (!resolvedConfig) {
    return res.status(404).json({ error: `Driver ${driverName} not found in gateway config.` });
  }

  try {
    const updatedStatus = await driverManager.upsertAndReloadDriver(driverName, resolvedConfig);
    return res.json({ success: true, driverName, status: updatedStatus });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to restart driver ${driverName}: ${err.message}` });
  }
});

adminRouter.post('/drivers/:name/stop', async (req: Request, res: Response) => {
  const driverName = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
  const rawConfig = getRawGatewayConfig();

  if (!rawConfig.outboundDrivers[driverName]) {
    return res.status(404).json({ error: `Driver ${driverName} not found.` });
  }

  rawConfig.outboundDrivers[driverName].enabled = false;
  saveRawGatewayConfig(rawConfig);

  const stoppedStatus = await driverManager.stopDriver(driverName);
  res.json({ success: true, driverName, status: stoppedStatus });
});

adminRouter.delete('/drivers/:name', async (req: Request, res: Response) => {
  const driverName = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
  const rawConfig = getRawGatewayConfig();

  if (!rawConfig.outboundDrivers[driverName]) {
    return res.status(404).json({ error: `Driver ${driverName} not found.` });
  }

  // 1. Remove from DriverManager
  await driverManager.removeDriver(driverName);

  // 2. Remove from raw config
  delete rawConfig.outboundDrivers[driverName];

  // 3. Remove from inbound adapter allowedDrivers
  for (const adapter of Object.values(rawConfig.inboundAdapters)) {
    if (adapter.allowedDrivers) {
      adapter.allowedDrivers = adapter.allowedDrivers.filter((d) => d !== driverName);
    }
  }

  saveRawGatewayConfig(rawConfig);
  res.json({ success: true, message: `Driver ${driverName} removed.` });
});

/**
 * 6. Marketplace Catalog
 */
adminRouter.get('/catalog', (req: Request, res: Response) => {
  const rawConfig = getRawGatewayConfig();
  const installedDrivers = new Set(Object.keys(rawConfig.outboundDrivers || {}));
  const statuses = driverManager.getDriversStatus();
  const statusMap = new Map(statuses.map((s) => [s.name, s]));

  const catalogWithStatus = MCP_MARKETPLACE_CATALOG.map((item) => {
    const isInstalled = installedDrivers.has(item.id);
    return {
      ...item,
      installed: isInstalled,
      currentStatus: isInstalled ? statusMap.get(item.id)?.status || 'CONFIGURED' : 'UNINSTALLED',
    };
  });

  res.json(catalogWithStatus);
});

/**
 * 7. Tools & Schema Discovery
 */
adminRouter.get('/tools', async (req: Request, res: Response) => {
  const allTools = await driverManager.getToolsList();
  const groupedByDriver: Record<string, any[]> = {};

  for (const tool of allTools) {
    const driverName = driverManager.getDriverNameForTool(tool.name) || 'unknown';
    if (!groupedByDriver[driverName]) {
      groupedByDriver[driverName] = [];
    }
    groupedByDriver[driverName].push(tool);
  }

  res.json({
    totalTools: allTools.length,
    tools: allTools,
    groupedByDriver,
  });
});

/**
 * 8. Interactive Tool Playground Execution
 */
adminRouter.post('/playground/execute', async (req: Request, res: Response) => {
  const { toolName, args, adapterName, userEmail } = req.body || {};

  if (!toolName) {
    return res.status(400).json({ error: 'toolName is required.' });
  }

  const effectiveAdapter = adapterName || 'generic';
  const effectiveEmail = userEmail || 'admin-playground@gateway.local';

  // Check adapter scoping if a specific adapter is simulated
  const rawConfig = getRawGatewayConfig();
  let allowedDrivers: string[] | undefined = undefined;
  if (effectiveAdapter !== 'admin_unrestricted') {
    allowedDrivers = rawConfig.inboundAdapters[effectiveAdapter]?.allowedDrivers;
  }

  const startTime = Date.now();
  const context = {
    userEmail: effectiveEmail,
    adapterName: effectiveAdapter,
    requestId: `playground-${Date.now()}`,
    timestamp: new Date().toISOString(),
    clientIp: req.ip,
  };

  const mcpRequest = {
    jsonrpc: '2.0',
    id: `play-${Date.now()}`,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args || {},
    },
  };

  const mcpResponse = await routeMcpRequest(mcpRequest, context, allowedDrivers);
  const durationMs = Date.now() - startTime;

  res.json({
    mcpResponse,
    durationMs,
    simulatedContext: {
      adapterName: effectiveAdapter,
      userEmail: effectiveEmail,
      allowedDrivers,
    },
  });
});

/**
 * 9. Inbound Adapter Permissions & Matrix
 */
adminRouter.put('/adapters/:adapterName', (req: Request, res: Response) => {
  const adapterName = Array.isArray(req.params.adapterName) ? req.params.adapterName[0] : req.params.adapterName;
  const { enabled, allowedDrivers, apiKey } = req.body || {};
  const rawConfig = getRawGatewayConfig();

  if (!rawConfig.inboundAdapters[adapterName]) {
    return res.status(404).json({ error: `Adapter ${adapterName} not found.` });
  }

  if (typeof enabled === 'boolean') {
    rawConfig.inboundAdapters[adapterName].enabled = enabled;
  }
  if (Array.isArray(allowedDrivers)) {
    rawConfig.inboundAdapters[adapterName].allowedDrivers = allowedDrivers;
  }
  if (apiKey !== undefined) {
    rawConfig.inboundAdapters[adapterName].apiKey = apiKey;
  }

  saveRawGatewayConfig(rawConfig);
  res.json({ success: true, adapter: rawConfig.inboundAdapters[adapterName] });
});

/**
 * 10. Governance & Quotas Controls
 */
adminRouter.get('/governance/users', (req: Request, res: Response) => {
  res.json({
    usersUsage: budgetManager.getAllUsersUsage(),
    activeRateLimits: rateLimiter.getActiveKeysSnapshot(),
    limits: {
      rateLimiter: rateLimiter.getConfig(),
      budgetManager: budgetManager.getConfig(),
    },
  });
});

adminRouter.put('/governance', (req: Request, res: Response) => {
  const { maxRequests, windowMs, maxDailyBytes } = req.body || {};
  const envUpdates: Record<string, string> = {};

  if (typeof maxRequests === 'number') {
    rateLimiter.setConfig({ maxRequests });
    envUpdates.RATE_LIMIT_MAX_REQUESTS = String(maxRequests);
  }
  if (typeof windowMs === 'number') {
    rateLimiter.setConfig({ windowMs });
    envUpdates.RATE_LIMIT_WINDOW_MS = String(windowMs);
  }
  if (typeof maxDailyBytes === 'number') {
    budgetManager.setConfig({ maxDailyBytes });
    envUpdates.USER_DAILY_BUDGET_BYTES = String(maxDailyBytes);
  }

  if (Object.keys(envUpdates).length > 0) {
    upsertEnvVariables(envUpdates);
  }

  res.json({
    success: true,
    rateLimiter: rateLimiter.getConfig(),
    budgetManager: budgetManager.getConfig(),
  });
});

adminRouter.post('/governance/reset-quota', (req: Request, res: Response) => {
  const { userEmail, rateLimitKey } = req.body || {};

  if (userEmail) {
    budgetManager.resetUser(userEmail);
  } else {
    budgetManager.clear();
  }

  if (rateLimitKey) {
    rateLimiter.resetKey(rateLimitKey);
  } else {
    rateLimiter.clear();
  }

  res.json({ success: true, message: 'Quota and rate limits reset successfully.' });
});

/**
 * 11. Environment & Secrets Manager
 */
adminRouter.get('/env', (req: Request, res: Response) => {
  // Collect known environment variables from process.env and .env file
  const envPath = require('path').join(process.cwd(), '.env');
  const envKeys = new Set<string>();

  if (require('fs').existsSync(envPath)) {
    try {
      const content = require('fs').readFileSync(envPath, 'utf-8');
      content.split('\n').forEach((line: string) => {
        const match = line.trim().match(/^([A-Za-z_0-9]+)\s*=/);
        if (match) envKeys.add(match[1]);
      });
    } catch {
      // Ignore read errors
    }
  }

  // Also add any relevant gateway process.env keys
  for (const key of Object.keys(process.env)) {
    if (
      key.startsWith('GCP_') ||
      key.startsWith('GITHUB_') ||
      key.startsWith('NOTION_') ||
      key.startsWith('SONAR') ||
      key.startsWith('CLICK') ||
      key.startsWith('DD_') ||
      key.startsWith('CONTEXT7_') ||
      key.startsWith('LINKEDIN_') ||
      key.startsWith('ATLASSIAN_') ||
      key.startsWith('AMPLITUDE_') ||
      key.startsWith('POSTGRES_') ||
      key.startsWith('REDIS_') ||
      key.startsWith('SENTRY_') ||
      key.startsWith('LINEAR_') ||
      key.startsWith('SLACK_') ||
      key.startsWith('BRAVE_') ||
      key.startsWith('RATE_LIMIT_') ||
      key.startsWith('USER_DAILY_') ||
      key.startsWith('ADMIN_API_KEY') ||
      key.startsWith('GENERIC_ADAPTER_') ||
      key.startsWith('OPENAI_ADAPTER_') ||
      key.startsWith('MASTER_SECRET_KEY')
    ) {
      envKeys.add(key);
    }
  }

  const result = Array.from(envKeys).sort().map((key) => {
    const val = process.env[key] || '';
    const isSecret = /KEY|TOKEN|SECRET|PASSWORD|AUTH|CREDENTIAL/i.test(key);
    const maskedValue = isSecret && val.length > 0
      ? (val.length > 8 ? val.slice(0, 4) + '...' + val.slice(-4) : '••••••••')
      : val;
    return {
      key,
      value: isSecret ? '' : val,
      maskedValue,
      isSecret,
      isSet: val.length > 0,
    };
  });

  res.json({ variables: result });
});

adminRouter.put('/env', (req: Request, res: Response) => {
  const { vars } = req.body as { vars: Record<string, string> };
  if (!vars || typeof vars !== 'object') {
    return res.status(400).json({ error: 'Body must contain "vars" object.' });
  }

  upsertEnvVariables(vars);
  res.json({ success: true, message: 'Environment variables updated and persisted successfully.' });
});

export default adminRouter;
