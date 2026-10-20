import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bigquery from '../src/drivers/bigquery';

// Mock @google-cloud/bigquery
vi.mock('@google-cloud/bigquery', () => {
  const getMetadataMock = vi.fn().mockResolvedValue([{
    description: 'Mock Description',
    type: 'TABLE',
    numRows: '100',
    schema: {
      fields: [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' }
      ]
    },
    timePartitioning: { type: 'DAY', field: 'created_at' }
  }]);

  const createQueryJobMock = vi.fn().mockResolvedValue([
    {
      id: 'job_123',
      metadata: {
        statistics: {
          query: { totalBytesProcessed: '1073741824' } // 1 GB
        }
      },
      getQueryResults: vi.fn().mockResolvedValue([
        [{ id: '1', created_at: '2023-01-01T00:00:00Z' }]
      ])
    }
  ]);

  const tableMock = vi.fn(() => ({
    getMetadata: getMetadataMock
  }));

  const datasetMock = vi.fn(() => ({
    table: tableMock
  }));

  class BigQueryMock {
    dataset = datasetMock;
    createQueryJob = createQueryJobMock;
  }

  return { BigQuery: BigQueryMock };
});

describe('bigquery module', () => {
  beforeEach(() => {
    process.env.GCP_PROJECT_ID = 'test-project';
    process.env.ALLOWLIST_TABLES = 'dataset1.table1,project2.dataset2.table2';
    vi.clearAllMocks();
  });

  describe('isTableAllowlisted', () => {
    it('should recognize table without project ID that is in allowlist', () => {
      expect(bigquery.isTableAllowlisted('dataset1', 'table1')).toBe(true);
    });

    it('should recognize table with project ID that is in allowlist', () => {
      expect(bigquery.isTableAllowlisted('dataset2', 'table2')).toBe(true);
    });

    it('should ignore case (case-insensitive)', () => {
      expect(bigquery.isTableAllowlisted('DATASET1', 'TABLE1')).toBe(true);
    });

    it('should return false for unlisted tables', () => {
      expect(bigquery.isTableAllowlisted('dataset3', 'table3')).toBe(false);
    });

    it('should recognize tables from multiline environment variable (with newlines and spaces)', () => {
      process.env.ALLOWLIST_TABLES = `
        dataset_a.table_a,
        dataset_b.table_b
      `;
      expect(bigquery.isTableAllowlisted('dataset_a', 'table_a')).toBe(true);
      expect(bigquery.isTableAllowlisted('dataset_b', 'table_b')).toBe(true);
    });
  });

  describe('listAllowedTables', () => {
    it('should retrieve metadata from allowlisted tables', async () => {
      const tables = await bigquery.listAllowedTables();
      expect(tables).toHaveLength(2);
      expect(tables[0].name).toBe('table1');
      expect(tables[0].dataset).toBe('dataset1');
      expect(tables[0].description).toBe('Mock Description');
      expect(tables[0].numRows).toBe(100);
    });
  });

  describe('describeTable', () => {
    it('should throw error if table is not allowlisted', async () => {
      await expect(bigquery.describeTable('dataset3', 'table3')).rejects.toThrow(/not in the allowlist/);
    });

    it('should return schema for allowed table', async () => {
      const schema = await bigquery.describeTable('dataset1', 'table1');
      expect(schema.table).toBe('dataset1.table1');
      expect(schema.fields).toHaveLength(2);
      expect(schema.fields[0].name).toBe('id');
      expect(schema.partitionInfo?.type).toBe('TIME');
    });
  });

  describe('estimateQueryCost', () => {
    it('should estimate cost based on dryRun', async () => {
      const estimate = await bigquery.estimateQueryCost('SELECT * FROM dataset1.table1');
      expect(estimate.valid).toBe(true);
      expect(estimate.bytesScanned).toBe(1073741824); // 1 GB
      expect(estimate.bytesScannedGb).toBe(1);
      expect(estimate.estimatedCostUsd).toBe(0.00625);
    });
  });

  describe('executeReadonlyQuery', () => {
    it('should execute query and limit maxResults client-side', async () => {
      const results = await bigquery.executeReadonlyQuery('SELECT * FROM dataset1.table1');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });
  });
});
