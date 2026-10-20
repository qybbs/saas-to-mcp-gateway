import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { validateQuerySafety } from '../src/drivers/bigqueryPolicy';
import * as bigquery from '../src/drivers/bigquery';

describe('validateQuerySafety', () => {
  beforeAll(() => {
    // Setup environment variable for tests
    process.env.ALLOWLIST_TABLES = 'my_project.my_dataset.my_table,another_dataset.allowed_table';
  });

  afterEach(() => {
    // Clean up if necessary
  });

  it('should allow simple SELECT query on allowlisted table', () => {
    const sql = 'SELECT * FROM `my_dataset.my_table` LIMIT 10';
    const result = validateQuerySafety(sql);
    
    expect(result.safe).toBe(true);
    expect(result.detectedTables).toContain('my_dataset.my_table');
  });

  it('should allow queries with WITH clause (Common Table Expressions)', () => {
    const sql = 'WITH cte AS (SELECT * FROM `my_dataset.my_table`) SELECT * FROM cte';
    const result = validateQuerySafety(sql);
    
    expect(result.safe).toBe(true);
    expect(result.detectedTables).toContain('my_dataset.my_table');
  });

  it('should detect table with project ID', () => {
    const sql = 'SELECT * FROM `my_project.my_dataset.my_table`';
    const result = validateQuerySafety(sql);
    
    expect(result.safe).toBe(true);
    // validateQuerySafety strips the project name and returns dataset.table
    expect(result.detectedTables).toContain('my_dataset.my_table');
  });

  it('should reject non-SELECT queries (e.g. DELETE)', () => {
    const sql = 'DELETE FROM `my_dataset.my_table` WHERE id = 1';
    const result = validateQuerySafety(sql);
    
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Only SELECT');
  });

  it('should reject tables that are not in the allowlist', () => {
    const sql = 'SELECT * FROM `my_dataset.secret_table`';
    const result = validateQuerySafety(sql);
    
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('is not in the allowlist');
  });

  it('should reject queries containing forbidden keywords', () => {
    const sql = 'SELECT * FROM `my_dataset.my_table`; DROP TABLE `my_dataset.my_table`;';
    const result = validateQuerySafety(sql);
    
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('forbidden keyword: "drop"');
  });

  it('should strip comments so tables/keywords are accurately detected', () => {
    const sql = `
      -- fake comment
      SELECT * 
      FROM \`my_dataset.my_table\`
      /* comment drop table */
    `;
    const result = validateQuerySafety(sql);
    
    expect(result.safe).toBe(true);
    expect(result.detectedTables).toContain('my_dataset.my_table');
  });

  it('should fail queries that insert forbidden keywords after an inline comment', () => {
    const sql = 'SELECT * FROM `my_dataset.my_table` -- comment \n DROP TABLE `my_dataset.my_table`';
    const result = validateQuerySafety(sql);
    
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('forbidden keyword: "drop"');
  });
});
