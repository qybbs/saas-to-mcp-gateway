import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeMcpRequest } from '../src/core/mcp/router.js';
import { ToolContext } from '../src/core/mcp/context.js';
import { driverManager } from '../src/core/mcp/driverManager.js';
import { rateLimiter } from '../src/core/security/rateLimiter.js';
import { budgetManager } from '../src/core/security/budgetManager.js';
import { BigQueryDriver } from '../src/drivers/bigqueryDriver.js';
import * as bigqueryModule from '../src/drivers/bigquery.js';

// Mock BigQuery SDK for driver testing
vi.mock('@google-cloud/bigquery', () => {
  let lastJobOptions: any = null;

  const createQueryJobMock = vi.fn().mockImplementation((options) => {
    lastJobOptions = options;
    return Promise.resolve([
      {
        id: 'mock_bq_job_789',
        metadata: {
          statistics: {
            query: {
              totalBytesBilled: '52428800', // 50 MB
              totalBytesProcessed: '52428800',
            },
          },
        },
        getQueryResults: vi.fn().mockResolvedValue([
          [{ id: 'rec_1', name: 'Alpha' }],
        ]),
      },
    ]);
  });

  class BigQueryMock {
    createQueryJob = createQueryJobMock;
    getLastJobOptions = () => lastJobOptions;
  }

  return { BigQuery: BigQueryMock };
});

describe('User Identity Propagation & FinOps Attribution (Phase 4)', () => {
  beforeEach(() => {
    rateLimiter.clear();
    budgetManager.clear();
    process.env.GCP_PROJECT_ID = 'test-gcp-project';
    process.env.ALLOWLIST_TABLES = 'analytics.users';
    vi.clearAllMocks();
  });

  describe('routeMcpRequest with ToolContext', () => {
    it('should validate and forward full ToolContext to downstream driver', async () => {
      const mockDriverCall = vi.fn().mockResolvedValue({
        status: 'ok',
        _audit: { actualBytesBilled: 1048576, jobId: 'job-123' },
      });

      // Register mock tool to singleton driverManager
      (driverManager as any).toolRegistry.set('mockDriver_doSomething', 'mockDriver');
      (driverManager as any).drivers.set('mockDriver', {
        name: 'mockDriver',
        prefix: 'mockDriver_',
        callTool: mockDriverCall,
      });

      const context: ToolContext = {
        userEmail: 'dev.tester@enterprise.com',
        adapterName: 'atlassian',
        requestId: 'req-42',
        timestamp: new Date().toISOString(),
        clientIp: '192.168.1.100',
      };

      const request = {
        jsonrpc: '2.0',
        id: 'req-42',
        method: 'tools/call',
        params: {
          name: 'mockDriver_doSomething',
          arguments: { param: 'test' },
        },
      };

      const response = await routeMcpRequest(request, context);

      expect(response?.error).toBeUndefined();
      expect(mockDriverCall).toHaveBeenCalledWith(
        'doSomething',
        { param: 'test' },
        context
      );
      // Ensure actualBytesBilled is recorded into budgetManager for dev.tester@enterprise.com
      const usage = budgetManager.getUsage('dev.tester@enterprise.com', 10000000);
      expect(usage.usedBytes).toBe(1048576);
    });

    it('should reject request with JSON-RPC error -32000 when rate limit is exceeded', async () => {
      const user = 'spammy.agent@localhost';
      const context: ToolContext = {
        userEmail: user,
        adapterName: 'generic',
        requestId: 'req-rate-limit',
        timestamp: new Date().toISOString(),
      };

      const request = {
        jsonrpc: '2.0',
        id: 'req-rate-limit',
        method: 'tools/call',
        params: {
          name: 'any_tool',
          arguments: {},
        },
      };

      const originalMax = process.env.RATE_LIMIT_MAX_REQUESTS;
      process.env.RATE_LIMIT_MAX_REQUESTS = '1';

      try {
        // Exhaust initial rate limit slot
        rateLimiter.checkRateLimit('generic:spammy.agent@localhost');

        const response = await routeMcpRequest(request, context);
        expect(response?.error).toBeDefined();
        expect(response?.error?.code).toBe(-32000);
        expect(response?.error?.message).toContain('Rate limit exceeded');
      } finally {
        if (originalMax !== undefined) process.env.RATE_LIMIT_MAX_REQUESTS = originalMax;
        else delete process.env.RATE_LIMIT_MAX_REQUESTS;
      }
    });

    it('should reject bigquery query when user daily quota is exhausted', async () => {
      const user = 'budget.exhausted@enterprise.com';
      // Exhaust 100 MB quota
      budgetManager.recordUsage(user, 100 * 1024 * 1024);

      const context: ToolContext = {
        userEmail: user,
        adapterName: 'atlassian',
        requestId: 'req-budget',
        timestamp: new Date().toISOString(),
      };

      const request = {
        jsonrpc: '2.0',
        id: 'req-budget',
        method: 'tools/call',
        params: {
          name: 'bigquery_execute_readonly_query',
          arguments: { sql: 'SELECT * FROM analytics.users' },
        },
      };

      const originalBudget = process.env.USER_DAILY_BUDGET_BYTES;
      process.env.USER_DAILY_BUDGET_BYTES = (50 * 1024 * 1024).toString(); // 50 MB limit

      try {
        const response = await routeMcpRequest(request, context);
        expect(response?.error).toBeDefined();
        expect(response?.error?.code).toBe(-32000);
        expect(response?.error?.message).toContain('Daily query budget exceeded');
      } finally {
        if (originalBudget !== undefined) process.env.USER_DAILY_BUDGET_BYTES = originalBudget;
        else delete process.env.USER_DAILY_BUDGET_BYTES;
      }
    });
  });

  describe('BigQuery Driver FinOps Label Attribution', () => {
    it('should sanitize and attach user_email & mcp_adapter labels to BigQuery job', async () => {
      const context: ToolContext = {
        userEmail: 'Iqbal.Gozy+Finance@Corp.Domain.COM',
        adapterName: 'Atlassian-Rovo',
        requestId: 'job-req-1',
        timestamp: new Date().toISOString(),
      };

      const rows = await bigqueryModule.executeReadonlyQuery('SELECT * FROM analytics.users LIMIT 10', context);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('rec_1');

      // Check _queryMeta metadata
      const meta = (rows as any)._queryMeta;
      expect(meta).toBeDefined();
      expect(meta.jobId).toBe('mock_bq_job_789');
      expect(meta.actualBytesBilled).toBe(52428800);
    });

    it('BigQueryDriver.callTool should include jobId and actualBytesBilled in _audit', async () => {
      const driver = new BigQueryDriver();
      await driver.initialize();

      const context: ToolContext = {
        userEmail: 'analyst@enterprise.com',
        adapterName: 'generic',
        requestId: 'audit-req-1',
        timestamp: new Date().toISOString(),
      };

      const result = await driver.callTool(
        'execute_readonly_query',
        { sql: 'SELECT * FROM analytics.users' },
        context
      );

      expect(Array.isArray(result)).toBe(true);
      expect((result as any)._audit).toBeDefined();
      expect((result as any)._audit.jobId).toBe('mock_bq_job_789');
      expect((result as any)._audit.actualBytesBilled).toBe(52428800);
    });
  });
});
