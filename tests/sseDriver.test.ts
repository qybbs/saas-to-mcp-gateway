import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SseDriver } from '../src/drivers/sseDriver';

vi.mock('axios');

describe('SseDriver', () => {
  const mockConfig = {
    name: 'testSse',
    prefix: '/test-sse',
    url: 'http://localhost:8080/mcp'
  };

  let driver: SseDriver;

  beforeEach(() => {
    vi.clearAllMocks();
    driver = new SseDriver(mockConfig);
  });

  describe('initialize', () => {
    it('should throw error if url is empty', async () => {
      const invalidDriver = new SseDriver({ ...mockConfig, url: '' });
      await expect(invalidDriver.initialize()).rejects.toThrow(/URL is required/);
    });

    it('should call fetchToolsFromDownstream and populate cachedTools', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          result: {
            tools: [{ name: 'test_tool' }]
          }
        }
      });

      await driver.initialize();
      expect(axios.post).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({ method: 'tools/list' }),
        expect.any(Object)
      );
      
      const tools = await driver.listTools();
      expect(tools).toEqual([{ name: 'test_tool' }]);
    });

    it('should include custom headers when provided in config', async () => {
      const driverWithHeaders = new SseDriver({
        ...mockConfig,
        headers: {
          'X-Custom-Auth': 'Bearer test-token',
          'DD_API_KEY': 'dd-test-key'
        }
      });

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          result: {
            tools: [{ name: 'custom_tool' }]
          }
        }
      });

      await driverWithHeaders.initialize();
      expect(axios.post).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({ method: 'tools/list' }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Auth': 'Bearer test-token',
            'DD_API_KEY': 'dd-test-key'
          })
        })
      );
    });
  });

  describe('listTools', () => {
    it('should return cachedTools if already present', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { result: { tools: [{ name: 'cached_tool' }] } }
      });
      await driver.initialize(); // fetch and cache

      vi.mocked(axios.post).mockClear();

      const tools = await driver.listTools();
      expect(tools).toEqual([{ name: 'cached_tool' }]);
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should fetchToolsFromDownstream if cachedTools does not exist', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { result: { tools: [{ name: 'fetched_tool' }] } }
      });
      
      const tools = await driver.listTools();
      expect(tools).toEqual([{ name: 'fetched_tool' }]);
      expect(axios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendRequest error handling', () => {
    it('should throw error if response contains downstream error', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          error: { message: 'Something went wrong' }
        }
      });

      await expect(driver.listTools()).rejects.toThrow('Something went wrong');
    });

    it('should throw error if axios request fails', async () => {
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network Error'));

      await expect(driver.listTools()).rejects.toThrow('Network Error');
    });
  });

  describe('callTool', () => {
    it('should parse JSON content from result', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          result: {
            content: [{ text: '{"success":true}' }]
          }
        }
      });

      const res = await driver.callTool('some_tool', { arg: 1 });
      expect(res).toEqual({ success: true });
      expect(axios.post).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          method: 'tools/call',
          params: { name: 'some_tool', arguments: { arg: 1 } }
        }),
        expect.any(Object)
      );
    });

    it('should throw error if result.isError is true', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          result: {
            isError: true,
            content: [{ text: 'Tool failed internally' }]
          }
        }
      });

      await expect(driver.callTool('bad_tool', {})).rejects.toThrow('Tool failed internally');
    });

    it('should return raw string if JSON parsing fails', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          result: {
            content: [{ text: 'Not JSON format' }]
          }
        }
      });

      const res = await driver.callTool('text_tool', {});
      expect(res).toBe('Not JSON format');
    });

    it('should return entire result if content is empty', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          result: { ok: 1 }
        }
      });

      const res = await driver.callTool('void_tool', {});
      expect(res).toEqual({ ok: 1 });
    });
  });

  describe('shutdown', () => {
    it('should shut down gracefully', async () => {
      await expect(driver.shutdown()).resolves.toBeUndefined();
    });
  });
});
