import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import * as jose from 'jose';
import app from '../src/server';
import { driverManager } from '../src/core/mcp/driverManager';
import { BigQueryDriver } from '../src/drivers/bigqueryDriver';
import { StdioDriver } from '../src/drivers/stdioDriver';
import { DcrPersistenceMode } from '../src/core/auth/types';

vi.mock('../src/config/gateway.config', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    gatewayConfig: {
      outboundDrivers: {
        bigquery: {
          type: 'bigquery'
        },
        sonarqube: {
          type: 'stdio',
          command: 'node',
          args: ['mock.js']
        }
      },
      inboundAdapters: {
        atlassian: {
          enabled: true,
          allowedDrivers: ['bigquery']
        },
        generic: {
          enabled: true,
          allowedDrivers: ['sonarqube'],
          apiKey: ''
        }
      }
    }
  };
});

vi.mock('../src/drivers/bigqueryDriver');
vi.mock('../src/drivers/stdioDriver');

describe('Inbound Scoping Enforcement (allowedDrivers)', () => {
  let token: string;
  const masterSecret = 'a3N2ZHNkZnNkZmRzZnNkZnNkZmRzZnNkZnNkZmRzZmQ=';

  beforeAll(async () => {
    process.env.MASTER_SECRET_KEY = masterSecret;
    process.env.GCP_PROJECT_ID = 'test-project';
    process.env.ALLOWLIST_TABLES = 'dataset1.table1';
    process.env.DCR_PERSISTENCE_MODE = DcrPersistenceMode.STATELESS;
    process.env.AUTH_PROVIDER = 'MOCK';
    process.env.MOCK_USER_EMAIL = 'test@example.com';
    process.env.MOCK_USER_PASSWORD = 'password123';

    // Mock BigQuery Driver
    vi.mocked(BigQueryDriver).mockImplementation(function() {
      return {
        name: 'bigquery',
        prefix: 'bigquery_',
        initialize: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue([
          { name: 'query_data', description: 'BigQuery tool' }
        ]),
        callTool: vi.fn().mockResolvedValue({ rows: [] }),
        shutdown: vi.fn().mockResolvedValue(undefined),
      } as any;
    });

    // Mock Stdio Driver (SonarQube)
    vi.mocked(StdioDriver).mockImplementation(function() {
      return {
        name: 'sonarqube',
        prefix: 'sonarqube_',
        initialize: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue([
          { name: 'get_issues', description: 'SonarQube tool' }
        ]),
        callTool: vi.fn().mockResolvedValue({ issues: [] }),
        shutdown: vi.fn().mockResolvedValue(undefined),
      } as any;
    });

    await driverManager.initialize();

    const secretKey = Buffer.from(masterSecret, 'base64');
    token = await new jose.SignJWT({
      email: 'test@example.com',
      client_id: 'some-client-id',
      scope: 'mcp:execute',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secretKey);
  });

  describe('Atlassian Adapter (allowedDrivers: [bigquery])', () => {
    it('tools/list should only return tools from bigquery', async () => {
      const res = await request(app)
        .post('/atlassian/mcp')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        });

      expect(res.status).toBe(200);
      const tools = res.body.result.tools;
      expect(tools.some((t: any) => t.name === 'bigquery_query_data')).toBe(true);
      expect(tools.some((t: any) => t.name === 'sonarqube_get_issues')).toBe(false);
    });

    it('should reject tool execution from sonarqube driver with 403 status', async () => {
      const res = await request(app)
        .post('/atlassian/mcp')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'sonarqube_get_issues',
            arguments: {}
          }
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(-32000);
      expect(res.body.error.message).toContain('Access Denied: You do not have permission to use tools from driver sonarqube');
    });

    it('should reject request path URL if driver is not permitted in config (/atlassian/sonarqube/mcp)', async () => {
      const res = await request(app)
        .post('/atlassian/sonarqube/mcp')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/list'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Driver "sonarqube" is not allowed for this adapter');
    });

    it('should allow tool execution from allowed bigquery driver', async () => {
      const res = await request(app)
        .post('/atlassian/mcp')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'bigquery_query_data',
            arguments: {}
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
    });
  });

  describe('Generic Adapter (allowedDrivers: [sonarqube])', () => {
    it('tools/list should only return tools from sonarqube', async () => {
      const res = await request(app)
        .post('/generic/mcp')
        .send({
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/list'
        });

      expect(res.status).toBe(200);
      const tools = res.body.result.tools;
      expect(tools.some((t: any) => t.name === 'sonarqube_get_issues')).toBe(true);
      expect(tools.some((t: any) => t.name === 'bigquery_query_data')).toBe(false);
    });

    it('should reject tool execution from bigquery driver with 403 status', async () => {
      const res = await request(app)
        .post('/generic/mcp')
        .send({
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: {
            name: 'bigquery_query_data',
            arguments: {}
          }
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(-32000);
      expect(res.body.error.message).toContain('Access Denied: You do not have permission to use tools from driver bigquery');
    });
  });
});
