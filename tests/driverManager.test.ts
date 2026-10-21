import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DriverManager } from '../src/core/mcp/driverManager';
import { gatewayConfig } from '../src/config/gateway.config';
import { StdioDriver } from '../src/drivers/stdioDriver';
import { SseDriver } from '../src/drivers/sseDriver';

vi.mock('../src/config/gateway.config', () => ({
  gatewayConfig: {
    outboundDrivers: {}
  }
}));

vi.mock('../src/drivers/stdioDriver');
vi.mock('../src/drivers/sseDriver');

describe('DriverManager', () => {
  let driverManager: DriverManager;

  beforeEach(() => {
    vi.clearAllMocks();
    driverManager = new DriverManager();
    // Reset config before each test
    gatewayConfig.outboundDrivers = {};
  });

  describe('initialize', () => {
    it('should skip if there are no outboundDrivers', async () => {
      gatewayConfig.outboundDrivers = undefined as any;
      await expect(driverManager.initialize()).resolves.toBeUndefined();
    });

    it('should initialize stdio driver', async () => {
      gatewayConfig.outboundDrivers = {
        testStdio: { type: 'stdio', command: 'node', args: ['-v'], env: { MOCK: '1' } }
      };

      const mockInit = vi.fn().mockResolvedValue(undefined);
      const mockListTools = vi.fn().mockResolvedValue([{ name: 'tool2' }]);
      vi.mocked(StdioDriver).mockImplementation(function() {
        return {
          name: 'testStdio',
          prefix: 'testStdio_',
          initialize: mockInit,
          listTools: mockListTools,
          callTool: vi.fn(),
          shutdown: vi.fn(),
        } as any;
      });

      await driverManager.initialize();

      expect(StdioDriver).toHaveBeenCalledWith(expect.objectContaining({
        name: 'testStdio',
        command: 'node',
        args: ['-v']
      }));
      expect(mockInit).toHaveBeenCalled();

      const tools = await driverManager.getToolsList();
      expect(tools[0].name).toBe('testStdio_tool2');
    });

    it('should skip stdio driver if command is empty', async () => {
      gatewayConfig.outboundDrivers = {
        testStdioBad: { type: 'stdio' } as any
      };
      await driverManager.initialize();
      expect(StdioDriver).not.toHaveBeenCalled();
    });

    it('should initialize sse driver', async () => {
      gatewayConfig.outboundDrivers = {
        testSse: { type: 'sse', url: 'http://localhost/sse' }
      };

      const mockInit = vi.fn().mockResolvedValue(undefined);
      const mockListTools = vi.fn().mockResolvedValue([{ name: 'tool3' }]);
      vi.mocked(SseDriver).mockImplementation(function() {
        return {
          name: 'testSse',
          prefix: 'testSse_',
          initialize: mockInit,
          listTools: mockListTools,
          callTool: vi.fn(),
          shutdown: vi.fn(),
        } as any;
      });

      await driverManager.initialize();

      expect(SseDriver).toHaveBeenCalledWith({
        name: 'testSse',
        prefix: 'testSse_',
        url: 'http://localhost/sse',
        headers: undefined
      });
      expect(mockInit).toHaveBeenCalled();

      const tools = await driverManager.getToolsList();
      expect(tools[0].name).toBe('testSse_tool3');
    });

    it('should initialize sse driver with custom headers', async () => {
      gatewayConfig.outboundDrivers = {
        testSseWithHeaders: {
          type: 'sse',
          url: 'http://localhost/sse',
          headers: { 'Authorization': 'Bearer test' }
        }
      };

      const mockInit = vi.fn().mockResolvedValue(undefined);
      vi.mocked(SseDriver).mockImplementation(function() {
        return {
          name: 'testSseWithHeaders',
          prefix: 'testSseWithHeaders_',
          initialize: mockInit,
          listTools: vi.fn().mockResolvedValue([]),
          callTool: vi.fn(),
          shutdown: vi.fn(),
        } as any;
      });

      await driverManager.initialize();

      expect(SseDriver).toHaveBeenCalledWith({
        name: 'testSseWithHeaders',
        prefix: 'testSseWithHeaders_',
        url: 'http://localhost/sse',
        headers: { 'Authorization': 'Bearer test' }
      });
      expect(mockInit).toHaveBeenCalled();
    });

    it('should skip sse driver if url is empty', async () => {
      gatewayConfig.outboundDrivers = {
        testSseBad: { type: 'sse' } as any
      };
      await driverManager.initialize();
      expect(SseDriver).not.toHaveBeenCalled();
    });

    it('should skip unknown driver types', async () => {
      gatewayConfig.outboundDrivers = {
        unknownDriver: { type: 'magic' } as any
      };
      await driverManager.initialize();
      const tools = await driverManager.getToolsList();
      expect(tools).toHaveLength(0);
    });

    it('should handle error if driver initialization fails', async () => {
      gatewayConfig.outboundDrivers = {
        failDriver: { type: 'stdio', command: 'node', args: ['mock.js'] }
      };

      const mockInit = vi.fn().mockRejectedValue(new Error('Init Failed'));
      vi.mocked(StdioDriver).mockImplementation(function() {
        return {
          name: 'failDriver',
          prefix: 'failDriver_',
          initialize: mockInit,
          listTools: vi.fn(),
          callTool: vi.fn(),
          shutdown: vi.fn(),
        } as any;
      });

      // Should not throw error, but caught in catch block and logged
      await expect(driverManager.initialize()).resolves.toBeUndefined();
    });
  });

  describe('getToolsList & getDriverNameForTool', () => {
    beforeEach(async () => {
      gatewayConfig.outboundDrivers = {
        d1: { type: 'stdio', command: 'node', args: ['mock1.js'] },
        d2: { type: 'stdio', command: 'node', args: ['mock2.js'] }
      };
      vi.mocked(StdioDriver).mockImplementation(function(config: any) {
        return {
          name: config.name,
          prefix: config.prefix,
          initialize: vi.fn().mockResolvedValue(undefined),
          listTools: vi.fn().mockResolvedValue([{ name: 'toolA' }]),
          callTool: vi.fn(),
          shutdown: vi.fn(),
        } as any;
      });

      await driverManager.initialize();
    });

    it('should filter tools based on allowedDrivers', async () => {
      const toolsD1 = await driverManager.getToolsList(['d1']);
      expect(toolsD1).toHaveLength(1);
      expect(toolsD1[0].name).toBe('d1_toolA');

      const toolsD2 = await driverManager.getToolsList(['d2']);
      expect(toolsD2).toHaveLength(1);
      expect(toolsD2[0].name).toBe('d2_toolA');
      
      const noTools = await driverManager.getToolsList(['d3']);
      expect(noTools).toHaveLength(0);
    });

    it('should return undefined for unknown tools', () => {
      expect(driverManager.getDriverNameForTool('unknown_tool')).toBeUndefined();
    });
  });

  describe('callTool', () => {
    let mockCallTool: any;

    beforeEach(async () => {
      mockCallTool = vi.fn().mockResolvedValue({ success: true });
      gatewayConfig.outboundDrivers = {
        mockD: { type: 'stdio', command: 'node', args: ['mock.js'] }
      };
      vi.mocked(StdioDriver).mockImplementation(function() {
        return {
          name: 'mockD',
          prefix: 'mockD_',
          initialize: vi.fn().mockResolvedValue(undefined),
          listTools: vi.fn().mockResolvedValue([{ name: 'myTool' }]),
          callTool: mockCallTool,
          shutdown: vi.fn(),
        } as any;
      });

      await driverManager.initialize();
    });

    it('should throw error if tool is not registered', async () => {
      await expect(driverManager.callTool('invalid_tool', {})).rejects.toThrow(/is not registered by any active driver/);
    });

    it('should invoke callTool on driver with original tool name (without prefix)', async () => {
      const result = await driverManager.callTool('mockD_myTool', { key: 'val' });
      expect(result).toEqual({ success: true });
      expect(mockCallTool).toHaveBeenCalledWith('myTool', { key: 'val' });
    });

    it('should throw error if driver is deleted after initialization', async () => {
      // simulate race condition / bug
      (driverManager as any).drivers.delete('mockD');
      await expect(driverManager.callTool('mockD_myTool', {})).rejects.toThrow(/Driver mockD is not active/);
    });
  });

  describe('shutdown', () => {
    it('should call shutdown on all active drivers', async () => {
      const mockShutdown1 = vi.fn().mockResolvedValue(undefined);
      const mockShutdown2 = vi.fn().mockRejectedValue(new Error('Shutdown error'));
      
      gatewayConfig.outboundDrivers = {
        d1: { type: 'stdio', command: 'node', args: ['mock1.js'] },
        d2: { type: 'stdio', command: 'node', args: ['mock2.js'] }
      };

      vi.mocked(StdioDriver)
        .mockImplementationOnce(function() {
          return {
            name: 'd1',
            prefix: 'd1_',
            initialize: vi.fn().mockResolvedValue(undefined),
            listTools: vi.fn().mockResolvedValue([]),
            callTool: vi.fn(),
            shutdown: mockShutdown1,
          } as any;
        })
        .mockImplementationOnce(function() {
          return {
            name: 'd2',
            prefix: 'd2_',
            initialize: vi.fn().mockResolvedValue(undefined),
            listTools: vi.fn().mockResolvedValue([]),
            callTool: vi.fn(),
            shutdown: mockShutdown2,
          } as any;
        });

      await driverManager.initialize();
      await driverManager.shutdown();

      expect(mockShutdown1).toHaveBeenCalled();
      expect(mockShutdown2).toHaveBeenCalled(); // Shutdown should continue despite errors
    });
  });
});
