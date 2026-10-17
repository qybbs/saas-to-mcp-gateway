import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StdioDriver } from '../src/drivers/stdioDriver';
import { EventEmitter } from 'events';

// Mock child_process and readline
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));
vi.mock('readline', () => ({
  createInterface: vi.fn()
}));

import { spawn } from 'child_process';
import { createInterface } from 'readline';

describe('StdioDriver', () => {
  let driver: StdioDriver;
  let mockProcess: any;
  let mockStdin: any;
  let mockRl: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStdin = {
      write: vi.fn((data, cb) => {
        if (typeof cb === 'function') cb(null);
      })
    };

    mockProcess = new EventEmitter();
    mockProcess.stdin = mockStdin;
    mockProcess.stdout = new EventEmitter();
    mockProcess.kill = vi.fn();

    vi.mocked(spawn).mockReturnValue(mockProcess as any);

    mockRl = new EventEmitter();
    vi.mocked(createInterface).mockReturnValue(mockRl as any);

    driver = new StdioDriver({
      name: 'test_stdio',
      prefix: 'stdio_',
      command: 'dummy_cmd',
      args: ['--test'],
      handshake: false
    });
  });

  afterEach(() => {
    driver.shutdown();
  });

  describe('initialize', () => {
    it('harus throw error jika command kosong', async () => {
      const invalidDriver = new StdioDriver({ name: 'x', prefix: '', command: '' });
      await expect(invalidDriver.initialize()).rejects.toThrow(/Command is required/);
    });

    it('harus membuat child process dan fetch tools', async () => {
      const initPromise = driver.initialize();

      // Simulate readline receiving the response for tools/list
      setTimeout(() => {
        mockRl.emit('line', JSON.stringify({
          jsonrpc: '2.0',
          id: 1, // first message id
          result: { tools: [{ name: 'toolA' }] }
        }));
      }, 10);

      await initPromise;

      expect(spawn).toHaveBeenCalledWith('dummy_cmd', ['--test'], expect.any(Object));
      const tools = await driver.listTools();
      expect(tools).toEqual([{ name: 'toolA' }]);
    });
  });

  describe('message handling and sendRequest', () => {
    it('harus menghandle response error dari JSON-RPC', async () => {
      const initPromise = driver.initialize();
      setTimeout(() => {
        mockRl.emit('line', JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          error: { message: 'Method not found' }
        }));
      }, 10);
      
      await expect(initPromise).rejects.toThrow('Method not found');
    });

    it('harus mengabaikan baris kosong dan message non-RPC', async () => {
      const initPromise = driver.initialize();

      setTimeout(() => {
        mockRl.emit('line', '   '); // empty line
        mockRl.emit('line', 'invalid json'); // triggers catch block in code
        mockRl.emit('line', JSON.stringify({ jsonrpc: '1.0' })); // ignored
        
        mockRl.emit('line', JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { tools: [] }
        }));
      }, 10);

      await expect(initPromise).resolves.toBeUndefined();
    });
  });

  describe('process events', () => {
    it('harus merespons event error dari child process', async () => {
      const initPromise = driver.initialize();

      setTimeout(() => {
        mockProcess.emit('error', new Error('Process crash'));
      }, 10);

      await expect(initPromise).rejects.toThrow('Process crash');
    });

    it('harus merespons event exit dari child process', async () => {
      const initPromise = driver.initialize();

      setTimeout(() => {
        mockProcess.emit('exit', 1);
      }, 10);

      await expect(initPromise).rejects.toThrow('Downstream process exited with code 1');
    });
  });

  describe('callTool', () => {
    beforeEach(async () => {
      const initPromise = driver.initialize();
      setTimeout(() => {
        mockRl.emit('line', JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { tools: [] }
        }));
      }, 10);
      await initPromise;
    });

    it('harus mengirim tools/call dan parse hasilnya', async () => {
      const callPromise = driver.callTool('my_tool', { a: 1 });
      
      setTimeout(() => {
        mockRl.emit('line', JSON.stringify({
          jsonrpc: '2.0',
          id: 2, // Second request
          result: {
            content: [{ text: '{"success":true}' }]
          }
        }));
      }, 10);

      const result = await callPromise;
      expect(result).toEqual({ success: true });
    });

    it('harus throw error jika result.isError true', async () => {
      const callPromise = driver.callTool('bad_tool', {});
      
      setTimeout(() => {
        mockRl.emit('line', JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          result: {
            isError: true,
            content: [{ text: 'Tool internal error' }]
          }
        }));
      }, 10);

      await expect(callPromise).rejects.toThrow('Tool internal error');
    });
  });

  describe('handshake', () => {
    it('harus melakukan initialize & notifications/initialized jika handshake diaktifkan', async () => {
      const handshakeDriver = new StdioDriver({
        name: 'test_handshake',
        prefix: 'hs_',
        command: 'dummy_cmd',
        handshake: true
      });

      // Hook mockStdin to respond to initialize (id: 1) and tools/list (id: 2)
      mockStdin.write.mockImplementation((data: any, cb: any) => {
        try {
          const req = JSON.parse(data.toString());
          if (req.method === 'initialize') {
            setTimeout(() => {
              mockRl.emit('line', JSON.stringify({
                jsonrpc: '2.0',
                id: req.id,
                result: { protocolVersion: '2024-11-05' }
              }));
            }, 5);
          } else if (req.method === 'tools/list') {
            setTimeout(() => {
              mockRl.emit('line', JSON.stringify({
                jsonrpc: '2.0',
                id: req.id,
                result: { tools: [{ name: 'tool_hs' }] }
              }));
            }, 5);
          }
        } catch {}
        if (typeof cb === 'function') cb(null);
      });

      await handshakeDriver.initialize();
      const tools = await handshakeDriver.listTools();
      expect(tools).toEqual([{ name: 'tool_hs' }]);
      expect(mockStdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"method":"initialize"'),
        expect.any(Function)
      );
    });
  });
});
