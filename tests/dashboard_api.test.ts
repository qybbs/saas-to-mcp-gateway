import { describe, it, expect, beforeEach } from 'vitest';
import { adminRouter, authenticateAdmin } from '../src/dashboard/routes';
import { renderDashboardHtml } from '../src/dashboard/ui';
import { clearAuditHistory, resetGatewayMetrics } from '../src/core/logging/audit';

// Helper to create lightweight mock Request / Response
const createMockReqRes = (options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
}) => {
  const req: any = {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    query: options.query || {},
    body: options.body || {},
    params: options.params || {},
    ip: '127.0.0.1',
    get: (header: string) => options.headers?.[header.toLowerCase()],
  };

  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    },
    setHeader(key: string, val: string) {
      this.headers[key] = val;
      return this;
    },
  };

  return { req, res };
};

describe('Phase 8 Dashboard UI & Admin API Router', () => {
  beforeEach(() => {
    clearAuditHistory();
    resetGatewayMetrics();
    delete process.env.ADMIN_API_KEY;
  });

  describe('renderDashboardHtml', () => {
    it('should render HTML with title, 5 tabs, and marketplace components', () => {
      const { req, res } = createMockReqRes({ method: 'GET', url: '/dashboard' });
      renderDashboardHtml(req, res);

      expect(res.headers['Content-Type']).toBe('text/html');
      expect(typeof res.body).toBe('string');
      expect(res.body).toContain('SaaS-to-MCP Gateway Management Console');
      expect(res.body).toContain('tab-overview');
      expect(res.body).toContain('tab-marketplace');
      expect(res.body).toContain('tab-playground');
      expect(res.body).toContain('tab-governance');
      expect(res.body).toContain('tab-env');
    });

    it('should include semantic ARIA landmarks, native dialog modals, and XSS-safe DOM rendering', () => {
      const { req, res } = createMockReqRes({ method: 'GET', url: '/dashboard' });
      renderDashboardHtml(req, res);

      expect(res.body).toContain('role="tablist"');
      expect(res.body).toContain('role="tab"');
      expect(res.body).toContain('role="tabpanel"');
      expect(res.body).toContain('<dialog id="installModal"');
      expect(res.body).toContain('<dialog id="confirmModal"');
      expect(res.body).toContain('id="toastRegion"');
      expect(res.body).toContain('prefers-reduced-motion: reduce');
      expect(res.body).not.toMatch(/\bonclick=/i);
      expect(res.body).not.toContain('window.alert(');
      expect(res.body).not.toContain('window.confirm(');
    });
  });

  describe('Admin Auth Guard (Dual-Mode)', () => {
    it('should allow access without credentials in Personal Mode (when ADMIN_API_KEY is unset)', () => {
      delete process.env.ADMIN_API_KEY;
      const { req, res } = createMockReqRes({});
      let nextCalled = false;
      authenticateAdmin(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it('should reject access with 401 in Enterprise Mode when ADMIN_API_KEY is missing or invalid', () => {
      process.env.ADMIN_API_KEY = 'super-secret-admin-token';
      const { req, res } = createMockReqRes({
        headers: { 'x-admin-key': 'wrong-token' },
      });
      let nextCalled = false;
      authenticateAdmin(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.body.authRequired).toBe(true);
    });

    it('should grant access in Enterprise Mode when valid x-admin-key header is provided', () => {
      process.env.ADMIN_API_KEY = 'super-secret-admin-token';
      const { req, res } = createMockReqRes({
        headers: { 'x-admin-key': 'super-secret-admin-token' },
      });
      let nextCalled = false;
      authenticateAdmin(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    it('should grant access in Enterprise Mode when valid query parameter is provided (for EventSource)', () => {
      process.env.ADMIN_API_KEY = 'super-secret-admin-token';
      const { req, res } = createMockReqRes({
        query: { adminKey: 'super-secret-admin-token' },
      });
      let nextCalled = false;
      authenticateAdmin(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });
  });

  describe('Environment & Secrets API Endpoints', () => {
    it('should list environment variables and mask sensitive keys', async () => {
      process.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'ghp_secret_token_12345';
      process.env.CLICKHOUSE_URL = 'http://localhost:8123';

      const routeHandler = (adminRouter.stack.find((s: any) => s.route?.path === '/env' && s.route?.methods?.get) as any)?.route?.stack?.[0]?.handle;
      expect(routeHandler).toBeDefined();

      const { req, res } = createMockReqRes({ method: 'GET', url: '/api/admin/env' });
      await routeHandler(req, res);

      expect(res.body.variables).toBeDefined();
      const githubVar = res.body.variables.find((v: any) => v.key === 'GITHUB_PERSONAL_ACCESS_TOKEN');
      expect(githubVar).toBeDefined();
      expect(githubVar.isSecret).toBe(true);
      expect(githubVar.maskedValue).toContain('...');
      expect(githubVar.value).toBe(''); // plaintext not returned for secrets

      const clickhouseVar = res.body.variables.find((v: any) => v.key === 'CLICKHOUSE_URL');
      expect(clickhouseVar).toBeDefined();
      expect(clickhouseVar.isSecret).toBe(false);
      expect(clickhouseVar.value).toBe('http://localhost:8123');
    });

    it('should update environment variables on PUT /api/admin/env', async () => {
      const routeHandler = (adminRouter.stack.find((s: any) => s.route?.path === '/env' && s.route?.methods?.put) as any)?.route?.stack?.[0]?.handle;
      expect(routeHandler).toBeDefined();

      const { req, res } = createMockReqRes({
        method: 'PUT',
        url: '/api/admin/env',
        body: {
          vars: {
            CUSTOM_TEST_VAR: 'hello_world_123',
          },
        },
      });
      await routeHandler(req, res);

      expect(res.body.success).toBe(true);
      expect(process.env.CUSTOM_TEST_VAR).toBe('hello_world_123');
    });
  });

  describe('Bulk Driver Actions Endpoints', () => {
    it('should handle start-all and stop-all endpoints', async () => {
      const stopAllHandler = (adminRouter.stack.find((s: any) => s.route?.path === '/drivers/actions/stop-all' && s.route?.methods?.post) as any)?.route?.stack?.[0]?.handle;
      expect(stopAllHandler).toBeDefined();

      const { req: stopReq, res: stopRes } = createMockReqRes({ method: 'POST', url: '/api/admin/drivers/actions/stop-all' });
      await stopAllHandler(stopReq, stopRes);
      expect(stopRes.body.success).toBe(true);
      expect(Array.isArray(stopRes.body.drivers)).toBe(true);

      const startAllHandler = (adminRouter.stack.find((s: any) => s.route?.path === '/drivers/actions/start-all' && s.route?.methods?.post) as any)?.route?.stack?.[0]?.handle;
      expect(startAllHandler).toBeDefined();

      const { req: startReq, res: startRes } = createMockReqRes({ method: 'POST', url: '/api/admin/drivers/actions/start-all' });
      await startAllHandler(startReq, startRes);
      expect(startRes.body.success).toBe(true);
      expect(Array.isArray(startRes.body.drivers)).toBe(true);
    });
  });
});

