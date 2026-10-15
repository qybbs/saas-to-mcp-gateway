export interface BudgetResult {
  allowed: boolean;
  usedBytes: number;
  maxBytes: number;
  remainingBytes: number;
  reason?: string;
}

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export class BudgetManager {
  private dailyUsage: Map<string, number> = new Map();
  private configuredMaxDailyBytes?: number;

  constructor(options?: { maxDailyBytes?: number }) {
    this.configuredMaxDailyBytes = options?.maxDailyBytes;
  }

  private getMaxDailyBytes(): number {
    if (this.configuredMaxDailyBytes !== undefined) {
      return this.configuredMaxDailyBytes;
    }
    const envBudget = process.env.USER_DAILY_BUDGET_BYTES;
    return envBudget ? Number.parseInt(envBudget, 10) : 0;
  }

  private getTodayKey(userEmail: string): string {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
    return `${userEmail.toLowerCase().trim()}:${today}`;
  }

  /**
   * Memeriksa apakah penggunaan user saat ini (ditambah estimasi byte kueri mendatang)
   * masih berada di dalam batas kuota harian.
   */
  checkBudget(userEmail: string, incomingEstimateBytes: number = 0, customDailyLimit?: number): BudgetResult {
    const maxBytes = customDailyLimit ?? this.getMaxDailyBytes();

    // Jika kuota <= 0, fitur budgeting dinonaktifkan (Personal Mode / Unlimited)
    if (maxBytes <= 0) {
      return {
        allowed: true,
        usedBytes: 0,
        maxBytes: 0,
        remainingBytes: Infinity,
      };
    }

    const key = this.getTodayKey(userEmail);
    const usedBytes = this.dailyUsage.get(key) || 0;
    const projectedTotal = usedBytes + incomingEstimateBytes;

    if (usedBytes >= maxBytes || projectedTotal > maxBytes) {
      const reason = `Daily query budget exceeded: Used ${formatBytes(usedBytes)} of ${formatBytes(maxBytes)} daily quota. Quota resets at 00:00 UTC.`;
      return {
        allowed: false,
        usedBytes,
        maxBytes,
        remainingBytes: Math.max(0, maxBytes - usedBytes),
        reason,
      };
    }

    return {
      allowed: true,
      usedBytes,
      maxBytes,
      remainingBytes: Math.max(0, maxBytes - projectedTotal),
    };
  }

  /**
   * Mencatat konsumsi byte aktual setelah kueri berhasil dieksekusi.
   */
  recordUsage(userEmail: string, actualBytes: number): void {
    if (actualBytes <= 0) return;

    const key = this.getTodayKey(userEmail);
    const current = this.dailyUsage.get(key) || 0;
    this.dailyUsage.set(key, current + actualBytes);
  }

  /**
   * Mengambil informasi penggunaan saat ini untuk user
   */
  getUsage(userEmail: string, customDailyLimit?: number): { usedBytes: number; maxBytes: number; remainingBytes: number; date: string } {
    const key = this.getTodayKey(userEmail);
    const usedBytes = this.dailyUsage.get(key) || 0;
    const maxBytes = customDailyLimit ?? this.getMaxDailyBytes();
    const today = new Date().toISOString().slice(0, 10);

    return {
      usedBytes,
      maxBytes,
      remainingBytes: maxBytes > 0 ? Math.max(0, maxBytes - usedBytes) : Infinity,
      date: today,
    };
  }

  /**
   * Reset data penggunaan (berguna untuk testing)
   */
  clear(): void {
    this.dailyUsage.clear();
  }
}

export const budgetManager = new BudgetManager();
