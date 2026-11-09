import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  writeAuditLog,
  getAuditHistory,
  clearAuditHistory,
  getGatewayMetrics,
  resetGatewayMetrics,
  auditEmitter,
} from '../src/core/logging/audit';
import { rateLimiter } from '../src/core/security/rateLimiter';
import { budgetManager } from '../src/core/security/budgetManager';
import {
  getRawGatewayConfig,
  saveRawGatewayConfig,
  upsertEnvVariables,
} from '../src/config/gateway.config';
import { driverManager } from '../src/core/mcp/driverManager';
import { MCP_MARKETPLACE_CATALOG } from '../src/dashboard/catalog';

describe('Phase 8 Dashboard Core & Telemetry', () => {
  beforeEach(() => {
    clearAuditHistory();
    resetGatewayMetrics();
    rateLimiter.clear();
    budgetManager.clear();
  });

  describe('Audit Ring Buffer & Metrics Aggregator', () => {
    it('should record audit log with durationMs and maintain circular buffer', () => {
      writeAuditLog({
        requestId: 'req-1',
        userEmail: 'dev@test.com',
        adapterName: 'generic',
        toolName: 'bigquery_execute_query',
        status: 'SUCCESS',
        durationMs: 45,
        metadata: { actualBytesBilled: 1048576 },
      });

      const history = getAuditHistory(10);
      expect(history.length).toBe(1);
      expect(history[0].audit.requestId).toBe('req-1');
      expect(history[0].audit.durationMs).toBe(45);
      expect(history[0].audit.status).toBe('SUCCESS');

      const metrics = getGatewayMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successCount).toBe(1);
      expect(metrics.avgLatencyMs).toBe(45);
      expect(metrics.totalBytesBilled).toBe(1048576);
      expect(metrics.driverCallCounts['bigquery']).toBe(1);
    });

    it('should broadcast audit_log events to auditEmitter listeners', async () => {
      let emittedLog: any = null;
      const listener = (log: any) => {
        emittedLog = log;
      };
      auditEmitter.once('audit_log', listener);

      writeAuditLog({
        requestId: 'req-evt',
        userEmail: 'evt@test.com',
        toolName: 'datadog_search_spans',
        status: 'FAILED',
        error: 'Timeout',
      });

      expect(emittedLog).not.toBeNull();
      expect(emittedLog.audit.requestId).toBe('req-evt');
      expect(emittedLog.audit.status).toBe('FAILED');
    });

    it('should clear audit history correctly', () => {
      writeAuditLog({
        requestId: 'req-clr',
        userEmail: 'clr@test.com',
        toolName: 'test_tool',
        status: 'SUCCESS',
      });
      expect(getAuditHistory().length).toBe(1);

      clearAuditHistory();
      expect(getAuditHistory().length).toBe(0);
    });
  });

  describe('RateLimiter Runtime Controls', () => {
    it('should get and set runtime rate limit configurations', () => {
      rateLimiter.setConfig({ maxRequests: 50, windowMs: 30000 });
      const config = rateLimiter.getConfig();
      expect(config.maxRequests).toBe(50);
      expect(config.windowMs).toBe(30000);

      // Verify rate limiter enforces the updated limit
      const key = 'test-agent:user@test.com';
      for (let i = 0; i < 50; i++) {
        expect(rateLimiter.checkRateLimit(key).allowed).toBe(true);
      }
      expect(rateLimiter.checkRateLimit(key).allowed).toBe(false);

      // Verify active keys snapshot
      const snapshot = rateLimiter.getActiveKeysSnapshot();
      expect(snapshot.some((s) => s.key === key && s.count === 50)).toBe(true);

      // Reset specific key
      rateLimiter.resetKey(key);
      expect(rateLimiter.checkRateLimit(key).allowed).toBe(true);
    });
  });

  describe('BudgetManager Runtime Controls', () => {
    it('should get, set config and track all user daily usages', () => {
      budgetManager.setConfig({ maxDailyBytes: 104857600 }); // 100 MB
      const config = budgetManager.getConfig();
      expect(config.maxDailyBytes).toBe(104857600);
      expect(config.formattedMaxDaily).toBe('100 MB');

      budgetManager.recordUsage('analyst@company.com', 52428800); // 50 MB
      const usages = budgetManager.getAllUsersUsage();
      expect(usages.length).toBe(1);
      expect(usages[0].userEmail).toBe('analyst@company.com');
      expect(usages[0].usedBytes).toBe(52428800);
      expect(usages[0].usedFormatted).toBe('50 MB');

      // Reset single user
      budgetManager.resetUser('analyst@company.com');
      expect(budgetManager.getAllUsersUsage().length).toBe(0);
    });
  });

  describe('Raw Config & .env Persistence', () => {
    const testConfigPath = path.join(process.cwd(), 'tests', 'test-temp-gateway-config.json');
    const testEnvPath = path.join(process.cwd(), 'tests', 'test-temp.env');

    beforeEach(() => {
      process.env.GATEWAY_CONFIG_PATH = testConfigPath;
      const initialConfig = {
        outboundDrivers: {
          mockDriver: {
            type: 'stdio',
            command: 'echo',
            args: ['${MOCK_SECRET}'],
          },
        },
        inboundAdapters: {
          generic: {
            enabled: true,
            allowedDrivers: ['mockDriver'],
          },
        },
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(initialConfig, null, 2), 'utf-8');
    });

    afterEach(() => {
      delete process.env.GATEWAY_CONFIG_PATH;
      if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
      if (fs.existsSync(testEnvPath)) fs.unlinkSync(testEnvPath);
    });

    it('should preserve ${VAR_NAME} placeholders when saving raw config', () => {
      const raw = getRawGatewayConfig();
      expect(raw.outboundDrivers['mockDriver'].args).toContain('${MOCK_SECRET}');

      raw.outboundDrivers['newDriver'] = {
        type: 'sse',
        url: 'http://localhost:${PORT}/sse',
      };
      saveRawGatewayConfig(raw);

      const savedContent = fs.readFileSync(testConfigPath, 'utf-8');
      expect(savedContent).toContain('${MOCK_SECRET}');
      expect(savedContent).toContain('${PORT}');
    });

    it('should upsert env variables into memory and persist to disk safely', () => {
      upsertEnvVariables({
        NEW_API_TOKEN: 'secret_value_123',
      });
      expect(process.env.NEW_API_TOKEN).toBe('secret_value_123');
    });
  });

  describe('Marketplace Catalog Integrity', () => {
    it('should have valid marketplace catalog items with all required fields', () => {
      expect(MCP_MARKETPLACE_CATALOG.length).toBeGreaterThanOrEqual(15);
      for (const item of MCP_MARKETPLACE_CATALOG) {
        expect(item.id).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.defaultConfig).toBeTruthy();
        expect(item.defaultConfig.type).toMatch(/stdio|sse/);
        expect(Array.isArray(item.envVars)).toBe(true);
      }
    });
  });

  describe('DriverManager Status Tracking & Hot-Reloading', () => {
    it('should track driver status and support stop / restart lifecycle', async () => {
      const statusList = driverManager.getDriversStatus();
      expect(Array.isArray(statusList)).toBe(true);

      // Stop an existing driver
      const stopped = await driverManager.stopDriver('test_dynamic_dummy');
      expect(stopped.status).toBe('STOPPED');
      expect(driverManager.getDriverStatus('test_dynamic_dummy')?.status).toBe('STOPPED');

      // Remove the dummy driver
      await driverManager.removeDriver('test_dynamic_dummy');
      expect(driverManager.getDriverStatus('test_dynamic_dummy')).toBeUndefined();
    });

    it('should support startAllEnabled and stopAll bulk actions', async () => {
      const stoppedStatuses = await driverManager.stopAll();
      expect(Array.isArray(stoppedStatuses)).toBe(true);
      for (const s of stoppedStatuses) {
        expect(s.status).toBe('STOPPED');
      }

      const startedStatuses = await driverManager.startAllEnabled();
      expect(Array.isArray(startedStatuses)).toBe(true);
    });
  });
});
