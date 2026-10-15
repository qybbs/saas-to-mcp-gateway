import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import app from '../src/server';
import { driverManager } from '../src/core/mcp/driverManager';
import { gatewayConfig } from '../src/config/gateway.config';
import { clearActiveTransports } from '../src/adapters/generic/sse';
import { DcrPersistenceMode } from '../src/core/auth/types';

vi.mock('../src/config/gateway.config', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    gatewayConfig: {
      outboundDrivers: {
        bigquery: {
          type: 'bigquery'
        }
      },
      inboundAdapters: {
        generic: {
          enabled: true,
          allowedDrivers: ['bigquery'],
          apiKey: ''
        }
      }
    }
  };
});

vi.mock('@google-cloud/bigquery', () => {
  const getMetadataMock = vi.fn().mockResolvedValue([{
    description: 'Mock Description',
    type: 'TABLE',
    numRows: '100',
    schema: {
      fields: [{ name: 'id', type: 'STRING', mode: 'REQUIRED' }]
    }
  }]);

  const createQueryJobMock = vi.fn().mockResolvedValue([
    {
      id: 'job_123',
      metadata: {
        statistics: {
          query: { totalBytesProcessed: '1073741824' }
        }
      },
      getQueryResults: vi.fn().mockResolvedValue([[{ id: '1' }]])
    }
  ]);

  class BigQueryMock {
    dataset = vi.fn(() => ({
      table: vi.fn(() => ({
        getMetadata: getMetadataMock
      }))
    }));
    createQueryJob = createQueryJobMock;
  }

  return { BigQuery: BigQueryMock };
});

describe('Generic Inbound Adapter (Cursor / Claude Code)', () => {
  const masterSecret = 'a3N2ZHNkZnNkZmRzZnNkZnNkZmRzZnNkZnNkZmRzZmQ=';
  let server: http.Server;
  let serverPort: number;

  beforeAll(async () => {
    process.env.MASTER_SECRET_KEY = masterSecret;
    process.env.GCP_PROJECT_ID = 'test-project';
    process.env.ALLOWLIST_TABLES = 'dataset1.table1';
    process.env.DCR_PERSISTENCE_MODE = DcrPersistenceMode.STATELESS;
    process.env.AUTH_PROVIDER = 'MOCK';
    process.env.MOCK_USER_EMAIL = 'test@example.com';
    process.env.MOCK_USER_PASSWORD = 'password123';

    await driverManager.initialize();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        serverPort = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  afterEach(() => {
    clearActiveTransports();
    if (gatewayConfig?.inboundAdapters?.generic) {
      gatewayConfig.inboundAdapters.generic.apiKey = '';
      gatewayConfig.inboundAdapters.generic.allowedDrivers = ['bigquery'];
    }
  });

  describe('Health Checks', () => {
    it('harus merespon 200 pada GET /generic/health', async () => {
      const res = await request(app).get('/generic/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', adapter: 'generic' });
    });

    it('harus merespon 200 pada GET /generic', async () => {
      const res = await request(app).get('/generic');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', adapter: 'generic' });
    });
  });

  describe('Direct HTTP JSON-RPC (POST /generic/mcp & POST /mcp)', () => {
    it('harus berhasil memproses method initialize via POST /generic/mcp', async () => {
      const res = await request(app)
        .post('/generic/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize'
        });

      expect(res.status).toBe(200);
      expect(res.body.result.serverInfo.name).toBe('enterprise-mcp-gateway');
    });

    it('harus berhasil memproses method tools/list via root POST /mcp', async () => {
      const res = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list'
        });

      expect(res.status).toBe(200);
      expect(res.body.result.tools).toBeDefined();
      expect(res.body.result.tools.some((t: any) => t.name === 'bigquery_list_allowed_tables')).toBe(true);
    });

    it('harus berhasil mengeksekusi tools/call via POST /generic/mcp', async () => {
      const res = await request(app)
        .post('/generic/mcp')
        .send({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'bigquery_list_allowed_tables'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.result.content[0].text).toContain('table1');
    });
  });

  describe('API Key Authentication', () => {
    it('harus menolak request jika API Key diwajibkan tetapi tidak disertakan', async () => {
      gatewayConfig!.inboundAdapters.generic.apiKey = 'secret-key-123';

      const res = await request(app)
        .post('/generic/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Unauthorized: Invalid or missing API Key');
    });

    it('harus menolak request jika API Key salah', async () => {
      gatewayConfig!.inboundAdapters.generic.apiKey = 'secret-key-123';

      const res = await request(app)
        .post('/generic/mcp')
        .set('Authorization', 'Bearer wrong-key')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize'
        });

      expect(res.status).toBe(401);
    });

    it('harus sukses dengan header Authorization Bearer yang valid', async () => {
      gatewayConfig!.inboundAdapters.generic.apiKey = 'secret-key-123';

      const res = await request(app)
        .post('/generic/mcp')
        .set('Authorization', 'Bearer secret-key-123')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize'
        });

      expect(res.status).toBe(200);
      expect(res.body.result.serverInfo.name).toBe('enterprise-mcp-gateway');
    });

    it('harus sukses dengan header X-API-Key yang valid', async () => {
      gatewayConfig!.inboundAdapters.generic.apiKey = 'secret-key-123';

      const res = await request(app)
        .post('/generic/mcp')
        .set('x-api-key', 'secret-key-123')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize'
        });

      expect(res.status).toBe(200);
    });
  });

  describe('Standard SSE Transport (GET /generic/sse, GET /sse, POST /messages)', () => {
    it('harus membuka stream SSE dan mengirim event endpoint pada GET /generic/sse', async () => {
      const response = await new Promise<any>((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${serverPort}/generic/sse`, (res) => {
          let chunk = '';
          res.on('data', (data) => {
            chunk += data.toString();
            if (chunk.includes('event: endpoint')) {
              req.destroy();
              resolve({
                status: res.statusCode,
                headers: res.headers,
                body: chunk
              });
            }
          });
        });
        req.on('error', (err) => {
          if ((err as any).code === 'ECONNRESET') return;
          reject(err);
        });
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.body).toContain('event: endpoint');
      expect(response.body).toContain('/generic/messages?sessionId=');
    });

    it('harus membuka stream SSE pada shortcut root GET /sse', async () => {
      const response = await new Promise<any>((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${serverPort}/sse`, (res) => {
          let chunk = '';
          res.on('data', (data) => {
            chunk += data.toString();
            if (chunk.includes('event: endpoint')) {
              req.destroy();
              resolve({
                status: res.statusCode,
                headers: res.headers,
                body: chunk
              });
            }
          });
        });
        req.on('error', (err) => {
          if ((err as any).code === 'ECONNRESET') return;
          reject(err);
        });
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.body).toContain('event: endpoint');
    });

    it('harus menolak POST /messages jika sessionId tidak disertakan', async () => {
      const res = await request(app)
        .post('/messages')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Missing sessionId');
    });

    it('harus menolak POST /messages jika sessionId tidak valid atau kadaluwarsa', async () => {
      const res = await request(app)
        .post('/messages?sessionId=non-existent-session-id')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

      expect(res.status).toBe(404);
      expect(res.text).toContain('not found or has expired');
    });

    it('harus sukses memproses pesan melalui SSE stream dan POST /messages', async () => {
      let sessionId = '';
      const sseReceivedMessages: string[] = [];

      let sseReq: http.ClientRequest;

      // 1. Establish SSE stream using native http.get
      await new Promise<void>((resolve, reject) => {
        sseReq = http.get(`http://127.0.0.1:${serverPort}/generic/sse`, (res) => {
          res.on('data', (data) => {
            const str = data.toString();
            sseReceivedMessages.push(str);

            const match = str.match(/sessionId=([a-zA-Z0-9-]+)/);
            if (match && !sessionId) {
              sessionId = match[1];
              resolve();
            }
          });
        });

        sseReq.on('error', (err) => {
          if ((err as any).code === 'ECONNRESET') return;
          reject(err);
        });
      });

      expect(sessionId).toBeTruthy();

      // 2. Send POST message to /generic/messages
      const postRes = await request(app)
        .post(`/generic/messages?sessionId=${sessionId}`)
        .send({
          jsonrpc: '2.0',
          id: 99,
          method: 'tools/list'
        });

      // Standard MCP SSE handles message and responds with 202 Accepted
      expect(postRes.status).toBe(202);

      // Wait brief moment for SSE stream to receive JSON-RPC response
      await new Promise((r) => setTimeout(r, 150));

      sseReq!.destroy();

      const allStreamOutput = sseReceivedMessages.join('');
      expect(allStreamOutput).toContain('event: message');
      expect(allStreamOutput).toContain('bigquery_list_allowed_tables');
    });
  });
});
