import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import app from '../src/server';
import { driverManager } from '../src/core/mcp/driverManager';
import { DcrPersistenceMode } from '../src/core/auth/types';
import { rateLimiter } from '../src/core/security/rateLimiter';

vi.mock('../src/config/gateway.config', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    gatewayConfig: {
      outboundDrivers: {
        bigquery: {
          type: 'stdio',
          command: 'node',
          args: ['mock.js'],
        },
      },
      inboundAdapters: {
        openai: {
          enabled: true,
          allowedDrivers: ['bigquery'],
          apiKey: 'test-openai-secret',
        },
      },
    },
  };
});

vi.mock('../src/drivers/stdioDriver', () => {
  return {
    StdioDriver: vi.fn().mockImplementation(function() {
      return {
        name: 'bigquery',
        prefix: 'bigquery_',
        initialize: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue([
          {
            name: 'execute_readonly_query',
            description: 'Execute readonly query',
            inputSchema: { type: 'object', properties: { sql: { type: 'string' } } },
          },
          {
            name: 'describe_table',
            description: 'Describe table',
            inputSchema: {
              type: 'object',
              properties: { datasetId: { type: 'string' }, tableId: { type: 'string' } },
              required: ['datasetId', 'tableId'],
            },
          },
          {
            name: 'search_allowed_tables',
            description: 'Search allowed tables',
            inputSchema: {
              type: 'object',
              properties: { keyword: { type: 'string' } },
              required: ['keyword'],
            },
          },
        ]),
        callTool: vi.fn().mockImplementation(async (name: string, args: any) => {
          if (name === 'search_allowed_tables' || name === 'bigquery_search_allowed_tables') {
            return { tables: [{ table: 'dataset1.table1' }] };
          }
          if (name === 'describe_table' || name === 'bigquery_describe_table') {
            return { fields: [{ name: 'id', type: 'STRING' }] };
          }
          if (name === 'execute_readonly_query' || name === 'bigquery_execute_readonly_query') {
            if (args?.sql?.includes('DROP')) {
              throw new Error('Rejected: Query contains forbidden keyword: "drop"');
            }
            return [{ id: '1' }];
          }
          return { success: true };
        }),
        shutdown: vi.fn().mockResolvedValue(undefined),
      } as any;
    }),
  };
});

describe('OpenAI Action Inbound Adapter (Custom GPTs / Assistants)', () => {
  const masterSecret = 'a3N2ZHNkZnNkZmRzZnNkZnNkZmRzZnNkZnNkZmRzZmQ=';
  const apiKey = 'test-openai-secret';
  let server: http.Server;

  beforeAll(async () => {
    process.env.MASTER_SECRET_KEY = masterSecret;
    process.env.GCP_PROJECT_ID = 'test-project';
    process.env.ALLOWLIST_TABLES = 'dataset1.table1';
    process.env.DCR_PERSISTENCE_MODE = DcrPersistenceMode.STATELESS;
    process.env.AUTH_PROVIDER = 'MOCK';
    process.env.MOCK_USER_EMAIL = 'test@example.com';
    process.env.MOCK_USER_PASSWORD = 'password123';
    process.env.OPENAI_ADAPTER_API_KEY = apiKey;
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.USER_DAILY_BUDGET_BYTES = '10737418240';

    await driverManager.initialize();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('GET /openai/health', () => {
    it('should return 200 OK with adapter info', async () => {
      const res = await request(app).get('/openai/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', adapter: 'openai' });
    });
  });

  describe('GET /openai/openapi.json (Schema Generator)', () => {
    it('should generate a valid OpenAPI 3.1.0 document with security schemes', async () => {
      const res = await request(app).get('/openai/openapi.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.1.0');
      expect(res.body.info).toBeDefined();
      expect(res.body.info.title).toContain('OpenAI Actions');
      expect(res.body.servers).toBeInstanceOf(Array);
      expect(res.body.paths).toBeDefined();

      // BigQuery tools must be present
      expect(res.body.paths['/tools/bigquery_execute_readonly_query']).toBeDefined();
      expect(res.body.paths['/tools/bigquery_describe_table']).toBeDefined();
      expect(res.body.paths['/tools/bigquery_search_allowed_tables']).toBeDefined();

      // Should have Bearer security scheme since apiKey is configured
      expect(res.body.components.securitySchemes.BearerAuth).toBeDefined();
      expect(res.body.security).toEqual([{ BearerAuth: [] }]);
    });

    it('should filter tools by driver query param ?drivers=bigquery', async () => {
      const res = await request(app).get('/openai/openapi.json?drivers=bigquery');
      expect(res.status).toBe(200);
      const paths = Object.keys(res.body.paths);
      expect(paths.length).toBeGreaterThan(0);
      paths.forEach((p) => {
        expect(p).toMatch(/^\/tools\/bigquery_/);
      });
    });

    it('should filter tools by specific tool name ?tools=bigquery_describe_table', async () => {
      const res = await request(app).get('/openai/openapi.json?tools=bigquery_describe_table');
      expect(res.status).toBe(200);
      expect(Object.keys(res.body.paths)).toEqual(['/tools/bigquery_describe_table']);
    });
  });

  describe('Authentication on POST /openai/tools/:toolName', () => {
    it('should reject requests without authorization header with 401', async () => {
      const res = await request(app)
        .post('/openai/tools/bigquery_describe_table')
        .send({ table_name: 'dataset1.table1' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should reject requests with invalid Bearer token with 401', async () => {
      const res = await request(app)
        .post('/openai/tools/bigquery_describe_table')
        .set('Authorization', 'Bearer invalid-secret')
        .send({ table_name: 'dataset1.table1' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should accept valid Bearer token', async () => {
      const res = await request(app)
        .post('/openai/tools/bigquery_describe_table')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ datasetId: 'dataset1', tableId: 'table1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should accept valid X-API-Key header', async () => {
      const res = await request(app)
        .post('/openai/tools/bigquery_describe_table')
        .set('X-API-Key', apiKey)
        .send({ datasetId: 'dataset1', tableId: 'table1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Tool Execution on POST /openai/tools/:toolName', () => {
    it('should return 404 Not Found for unregistered tools', async () => {
      const res = await request(app)
        .post('/openai/tools/non_existent_tool_123')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not registered');
    });

    it('should execute bigquery_search_allowed_tables successfully', async () => {
      const res = await request(app)
        .post('/openai/tools/bigquery_search_allowed_tables')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ keyword: 'table1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should execute bigquery_execute_readonly_query with valid SELECT query', async () => {
      const res = await request(app)
        .post('/openai/tools/bigquery_execute_readonly_query')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ sql: 'SELECT * FROM dataset1.table1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([{ id: '1' }]);
    });

    it('should return 400 Bad Request if query violates policy (e.g. DROP TABLE)', async () => {
      const res = await request(app)
        .post('/openai/tools/bigquery_execute_readonly_query')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ sql: 'DROP TABLE dataset1.table1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Rejected|Policy rejection|forbidden keyword/i);
    });

    it('should return 429 Too Many Requests when rate limit is exceeded', async () => {
      const spamUser = 'spammer@openai.com';
      // Mock rateLimiter to reject next request for this user
      vi.spyOn(rateLimiter, 'checkRateLimit').mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetMs: 45000,
      });

      const res = await request(app)
        .post('/openai/tools/bigquery_describe_table')
        .set('Authorization', `Bearer ${apiKey}`)
        .set('x-user-email', spamUser)
        .send({ table_name: 'dataset1.table1' });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Rate limit exceeded');
    });
  });
});
