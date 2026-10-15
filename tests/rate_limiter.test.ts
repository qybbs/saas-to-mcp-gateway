import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, rateLimiter } from '../src/core/security/rateLimiter.js';

describe('RateLimiter (Dual-Mode Security Guardrail)', () => {
  beforeEach(() => {
    vi.useRealTimers();
    rateLimiter.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Personal Mode (Unthrottled / Zero-Friction)', () => {
    it('harus membolehkan semua request jika limit <= 0 (default personal mode)', () => {
      const limiter = new RateLimiter({ maxRequests: 0, windowMs: 60000 });

      for (let i = 0; i < 20; i++) {
        const result = limiter.checkRateLimit('generic:developer@localhost');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(Infinity);
        expect(result.resetMs).toBe(0);
      }
    });

    it('harus membolehkan request jika customLimit bernilai 0 atau negatif', () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
      const result = limiter.checkRateLimit('generic:dev@localhost', 0);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);

      const negativeResult = limiter.checkRateLimit('generic:dev@localhost', -1);
      expect(negativeResult.allowed).toBe(true);
    });
  });

  describe('Enterprise Mode (Sliding Window Throttling)', () => {
    it('harus menghitung sisa quota dan memblokir request saat limit terlampaui', () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 });
      const key = 'atlassian:corp-user@enterprise.com';

      // Request 1
      const res1 = limiter.checkRateLimit(key);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      // Request 2
      const res2 = limiter.checkRateLimit(key);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      // Request 3
      const res3 = limiter.checkRateLimit(key);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      // Request 4 (melebihi limit)
      const res4 = limiter.checkRateLimit(key);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.resetMs).toBeGreaterThan(0);
    });

    it('harus mengisolasi quota antar user dan adapter berbeda', () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });

      // Alice di Atlassian
      expect(limiter.checkRateLimit('atlassian:alice@company.com').allowed).toBe(true);
      expect(limiter.checkRateLimit('atlassian:alice@company.com').allowed).toBe(true);
      expect(limiter.checkRateLimit('atlassian:alice@company.com').allowed).toBe(false);

      // Alice di Generic adapter memiliki bucket berbeda
      expect(limiter.checkRateLimit('generic:alice@company.com').allowed).toBe(true);

      // Bob memiliki bucket sendiri
      expect(limiter.checkRateLimit('atlassian:bob@company.com').allowed).toBe(true);
    });

    it('harus mereset limit setelah window waktu berlalu (sliding window)', () => {
      vi.useFakeTimers();
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 10000 }); // 10 detik
      const key = 'atlassian:user@company.com';

      // Konsumsi semua slot
      expect(limiter.checkRateLimit(key).allowed).toBe(true);
      expect(limiter.checkRateLimit(key).allowed).toBe(true);
      expect(limiter.checkRateLimit(key).allowed).toBe(false);

      // Maju 5 detik: masih belum lewat 10 detik window
      vi.advanceTimersByTime(5000);
      expect(limiter.checkRateLimit(key).allowed).toBe(false);

      // Maju 6 detik lagi (total 11 detik): window pertama sudah lewat
      vi.advanceTimersByTime(6000);
      const afterWindow = limiter.checkRateLimit(key);
      expect(afterWindow.allowed).toBe(true);
      expect(afterWindow.remaining).toBe(1);
    });

    it('harus dapat di-clear secara manual via limiter.clear()', () => {
      const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60000 });
      const key = 'test-key';

      expect(limiter.checkRateLimit(key).allowed).toBe(true);
      expect(limiter.checkRateLimit(key).allowed).toBe(false);

      limiter.clear();
      expect(limiter.checkRateLimit(key).allowed).toBe(true);
    });
  });
});
