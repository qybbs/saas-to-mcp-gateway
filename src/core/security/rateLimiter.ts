export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export class RateLimiter {
  private requestHistory: Map<string, number[]> = new Map();
  private configuredMaxRequests?: number;
  private configuredWindowMs?: number;

  constructor(options?: { maxRequests?: number; windowMs?: number }) {
    this.configuredMaxRequests = options?.maxRequests;
    this.configuredWindowMs = options?.windowMs;
  }

  private getMaxRequests(): number {
    if (this.configuredMaxRequests !== undefined) {
      return this.configuredMaxRequests;
    }
    const envMax = process.env.RATE_LIMIT_MAX_REQUESTS;
    return envMax ? Number.parseInt(envMax, 10) : 0;
  }

  private getWindowMs(): number {
    if (this.configuredWindowMs !== undefined) {
      return this.configuredWindowMs;
    }
    const envWindow = process.env.RATE_LIMIT_WINDOW_MS;
    return envWindow ? Number.parseInt(envWindow, 10) : 60000;
  }

  /**
   * Memeriksa apakah request untuk key tertentu masih berada di dalam limit sliding window.
   */
  checkRateLimit(key: string, customLimit?: number, customWindowMs?: number): RateLimitResult {
    const limit = customLimit ?? this.getMaxRequests();
    const windowMs = customWindowMs ?? this.getWindowMs();

    // Jika limit <= 0, fitur rate limiting dinonaktifkan (Personal Mode)
    if (limit <= 0) {
      return {
        allowed: true,
        remaining: Infinity,
        resetMs: 0,
      };
    }

    const now = Date.now();
    const threshold = now - windowMs;

    let timestamps = this.requestHistory.get(key) || [];
    // Buang timestamp yang sudah lewat dari window
    timestamps = timestamps.filter((t) => t > threshold);

    if (timestamps.length >= limit) {
      const oldest = timestamps[0] || now;
      const resetMs = Math.max(0, oldest + windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
      };
    }

    // Catat request baru
    timestamps.push(now);
    this.requestHistory.set(key, timestamps);

    const oldest = timestamps[0] || now;
    const resetMs = Math.max(0, oldest + windowMs - now);

    return {
      allowed: true,
      remaining: Math.max(0, limit - timestamps.length),
      resetMs,
    };
  }

  /**
   * Reset data rate limit (berguna untuk testing atau admin reset)
   */
  clear(): void {
    this.requestHistory.clear();
  }
}

export const rateLimiter = new RateLimiter();
