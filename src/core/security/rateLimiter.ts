export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export interface ActiveRateLimitKeySnapshot {
  key: string;
  count: number;
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
   * Retrieves currently effective rate limit configuration
   */
  getConfig(): { maxRequests: number; windowMs: number } {
    return {
      maxRequests: this.getMaxRequests(),
      windowMs: this.getWindowMs(),
    };
  }

  /**
   * Dynamically updates runtime rate limit configuration
   */
  setConfig(options: { maxRequests?: number; windowMs?: number }): void {
    if (options.maxRequests !== undefined) {
      this.configuredMaxRequests = options.maxRequests;
    }
    if (options.windowMs !== undefined) {
      this.configuredWindowMs = options.windowMs;
    }
  }

  /**
   * Returns a snapshot of all active rate-limited keys within their sliding windows
   */
  getActiveKeysSnapshot(): ActiveRateLimitKeySnapshot[] {
    const limit = this.getMaxRequests();
    const windowMs = this.getWindowMs();
    const now = Date.now();
    const threshold = now - windowMs;
    const snapshots: ActiveRateLimitKeySnapshot[] = [];

    for (const [key, timestamps] of this.requestHistory.entries()) {
      const activeTimestamps = timestamps.filter((t) => t > threshold);
      if (activeTimestamps.length > 0) {
        const oldest = activeTimestamps[0] || now;
        const resetMs = Math.max(0, oldest + windowMs - now);
        snapshots.push({
          key,
          count: activeTimestamps.length,
          remaining: limit > 0 ? Math.max(0, limit - activeTimestamps.length) : Infinity,
          resetMs,
        });
      }
    }

    return snapshots;
  }

  /**
   * Resets rate limit for a specific key
   */
  resetKey(key: string): void {
    this.requestHistory.delete(key);
  }

  /**
   * Checks whether a request for a specific key is still within the sliding window limit.
   */
  checkRateLimit(key: string, customLimit?: number, customWindowMs?: number): RateLimitResult {
    const limit = customLimit ?? this.getMaxRequests();
    const windowMs = customWindowMs ?? this.getWindowMs();

    // If limit <= 0, rate limiting is disabled (Personal Mode)
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
    // Discard timestamps that have passed the sliding window
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

    // Record new request timestamp
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
   * Resets all rate limit data (useful for testing or admin resets)
   */
  clear(): void {
    this.requestHistory.clear();
  }
}

export const rateLimiter = new RateLimiter();
