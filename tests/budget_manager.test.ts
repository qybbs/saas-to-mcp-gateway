import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetManager, budgetManager, formatBytes } from '../src/core/security/budgetManager.js';

describe('BudgetManager (Dual-Mode FinOps Guardrail)', () => {
  beforeEach(() => {
    budgetManager.clear();
  });

  describe('formatBytes helper', () => {
    it('harus memformat byte ke representasi string manusia dengan benar', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });
  });

  describe('Personal Mode (Zero-Friction / Unlimited)', () => {
    it('harus mengizinkan kueri tanpa batas jika kuota harian <= 0', () => {
      const manager = new BudgetManager({ maxDailyBytes: 0 });
      const email = 'developer@localhost';

      const check = manager.checkBudget(email, 100 * 1024 * 1024 * 1024); // 100 GB
      expect(check.allowed).toBe(true);
      expect(check.remainingBytes).toBe(Infinity);

      manager.recordUsage(email, 50 * 1024 * 1024 * 1024);
      const usage = manager.getUsage(email);
      expect(usage.remainingBytes).toBe(Infinity);
    });

    it('harus mengizinkan kueri jika customDailyLimit bernilai 0', () => {
      const manager = new BudgetManager({ maxDailyBytes: 1024 * 1024 });
      const check = manager.checkBudget('dev@localhost', 10 * 1024 * 1024, 0);
      expect(check.allowed).toBe(true);
      expect(check.remainingBytes).toBe(Infinity);
    });
  });

  describe('Enterprise Mode (Daily Quota Enforcement)', () => {
    const ONE_GB = 1024 * 1024 * 1024;
    const FIVE_GB = 5 * ONE_GB;

    it('harus mengizinkan kueri saat akumulasi penggunaan di bawah kuota', () => {
      const manager = new BudgetManager({ maxDailyBytes: FIVE_GB });
      const user = 'analyst@enterprise.com';

      // Cek awal (0 GB used, 1 GB estimated)
      const res1 = manager.checkBudget(user, ONE_GB);
      expect(res1.allowed).toBe(true);
      expect(res1.remainingBytes).toBe(4 * ONE_GB);

      // Rekam konsumsi 1 GB
      manager.recordUsage(user, ONE_GB);

      // Cek kueri kedua (1 GB used, 2 GB estimated)
      const res2 = manager.checkBudget(user, 2 * ONE_GB);
      expect(res2.allowed).toBe(true);
      expect(res2.usedBytes).toBe(ONE_GB);
      expect(res2.remainingBytes).toBe(2 * ONE_GB);
    });

    it('harus menolak kueri jika proyeksi byte melebihi sisa kuota harian', () => {
      const manager = new BudgetManager({ maxDailyBytes: FIVE_GB });
      const user = 'heavy-user@enterprise.com';

      // Rekam penggunaan 4 GB
      manager.recordUsage(user, 4 * ONE_GB);

      // Coba kueri yang butuh 2 GB (total 6 GB > 5 GB)
      const rejection = manager.checkBudget(user, 2 * ONE_GB);
      expect(rejection.allowed).toBe(false);
      expect(rejection.usedBytes).toBe(4 * ONE_GB);
      expect(rejection.remainingBytes).toBe(ONE_GB);
      expect(rejection.reason).toContain('Daily query budget exceeded');
      expect(rejection.reason).toContain('Used 4 GB of 5 GB daily quota');
    });

    it('harus mengabaikan recordUsage jika byte bernilai <= 0', () => {
      const manager = new BudgetManager({ maxDailyBytes: FIVE_GB });
      const user = 'user@test.com';

      manager.recordUsage(user, 0);
      manager.recordUsage(user, -100);

      const usage = manager.getUsage(user);
      expect(usage.usedBytes).toBe(0);
    });

    it('harus normalisasi email (case-insensitive & whitespace trimmed)', () => {
      const manager = new BudgetManager({ maxDailyBytes: FIVE_GB });

      manager.recordUsage('  Alice@Enterprise.COM  ', ONE_GB);
      const usage = manager.getUsage('alice@enterprise.com');
      expect(usage.usedBytes).toBe(ONE_GB);
    });

    it('harus dapat di-clear dengan manager.clear()', () => {
      const manager = new BudgetManager({ maxDailyBytes: FIVE_GB });
      const user = 'user@test.com';

      manager.recordUsage(user, 4 * ONE_GB);
      expect(manager.getUsage(user).usedBytes).toBe(4 * ONE_GB);

      manager.clear();
      expect(manager.getUsage(user).usedBytes).toBe(0);
    });
  });
});
