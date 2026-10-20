import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
import { ToolContext } from '../core/mcp/context';

dotenv.config();

// Helper to check if table is in allowlist
export const isTableAllowlisted = (datasetId: string, tableId: string): boolean => {
  const allowlist = (process.env.ALLOWLIST_TABLES || '')
    .split(',')
    .map(s => s.replace(/\s+/g, '').toLowerCase())
    .filter(Boolean);
  const targetName = `${datasetId}.${tableId}`.toLowerCase();
  
  return allowlist.some(allowed => {
    const parts = allowed.split('.');
    const allowedDataset = parts.length === 3 ? parts[1] : parts[0];
    const allowedTable = parts.length === 3 ? parts[2] : parts[1];
    return `${allowedDataset}.${allowedTable}` === targetName;
  });
};

// Initialize BigQuery Client using Key File or Application Default Credentials (ADC)
const getBigQueryClient = (): BigQuery => {
  const projectId = process.env.GCP_PROJECT_ID;
  const keyFilename = process.env.GCP_KEY_FILE_PATH;

  const config: any = {};
  if (projectId) config.projectId = projectId;
  if (keyFilename && keyFilename !== './service-account-key.json') {
    config.keyFilename = keyFilename;
  }

  return new BigQuery(config);
};

const bigquery = getBigQueryClient();

const getTableMetadata = async (tableConfig: string) => {
  const parts = tableConfig.split('.');
  if (parts.length !== 2 && parts.length !== 3) return null;

  const projectId = parts.length === 3 ? parts[0] : undefined;
  const datasetId = parts.length === 3 ? parts[1] : parts[0];
  const tableId = parts.length === 3 ? parts[2] : parts[1];

  try {
    const dataset = projectId ? bigquery.dataset(datasetId, { projectId }) : bigquery.dataset(datasetId);
    const table = dataset.table(tableId);
    const metadataOptions = process.env.GCP_PROJECT_ID ? { userProject: process.env.GCP_PROJECT_ID } : undefined;
    const [metadata] = await table.getMetadata(metadataOptions);
    
    return {
      table: tableConfig,
      projectId: projectId || process.env.GCP_PROJECT_ID || 'unknown',
      dataset: datasetId,
      name: tableId,
      description: metadata.description || 'No description available',
      type: metadata.type,
      numRows: metadata.numRows ? Number.parseInt(metadata.numRows, 10) : undefined,
    };
  } catch (e: any) {
    console.warn(`[BigQuery] Warning: Could not fetch metadata for allowlisted table "${tableConfig}":`, e.message);
    return {
      table: tableConfig,
      projectId: projectId || process.env.GCP_PROJECT_ID || 'unknown',
      dataset: datasetId,
      name: tableId,
      description: `Allowlisted table. (Metadata unavailable: ${e.message})`,
    };
  }
};

// 1. List Allowed Tables
export const listAllowedTables = async () => {
  const list = process.env.ALLOWLIST_TABLES || '';
  const tablesConfig = list.split(',').map(s => s.replace(/\s+/g, '')).filter(Boolean);
  
  const results = [];
  for (const tableConfig of tablesConfig) {
    const metadata = await getTableMetadata(tableConfig);
    if (metadata) results.push(metadata);
  }
  return results;
};

// 2. Describe Table Schema (with Partitioning & Clustering)
export const describeTable = async (datasetId: string, tableId: string) => {
  if (!isTableAllowlisted(datasetId, tableId)) {
    throw new Error(`Table ${datasetId}.${tableId} is not in the allowlist.`);
  }

  // To properly fetch schema, we should find the exact project ID from the allowlist if provided
  const allowlist = (process.env.ALLOWLIST_TABLES || '').split(',').map(s => s.replace(/\s+/g, '')).filter(Boolean);
  const tableConfig = allowlist.find(t => t.endsWith(`${datasetId}.${tableId}`));
  const parts = tableConfig ? tableConfig.split('.') : [];
  const projectId = parts.length === 3 ? parts[0] : undefined;

  const dataset = projectId ? bigquery.dataset(datasetId, { projectId }) : bigquery.dataset(datasetId);
  const table = dataset.table(tableId);
  const metadataOptions = process.env.GCP_PROJECT_ID ? { userProject: process.env.GCP_PROJECT_ID } : undefined;
  const [metadata] = await table.getMetadata(metadataOptions);

  const fields = (metadata.schema?.fields || []).map((f: any) => ({
    name: f.name,
    type: f.type,
    mode: f.mode,
    description: f.description || '',
  }));

  // Ekstraksi info Partisi
  let partitionInfo = null;
  if (metadata.timePartitioning) {
    partitionInfo = {
      type: 'TIME',
      field: metadata.timePartitioning.field || '_PARTITIONTIME',
      granularity: metadata.timePartitioning.type,
      requirePartitionFilter: !!metadata.timePartitioning.requirePartitionFilter,
    };
  } else if (metadata.rangePartitioning) {
    partitionInfo = {
      type: 'RANGE',
      field: metadata.rangePartitioning.field,
    };
  }

  // Ekstraksi info Clustering
  const clusteringInfo = metadata.clustering ? metadata.clustering.fields : null;

  return {
    table: `${datasetId}.${tableId}`,
    description: metadata.description || 'No description available',
    partitionInfo,
    clusteringInfo,
    fields,
  };
};

// 3. Estimate Query Cost (Dry Run)
export const estimateQueryCost = async (sql: string) => {
  try {
    const [job] = await bigquery.createQueryJob({
      query: sql,
      dryRun: true,
    });
    
    const bytes = Number.parseInt(job.metadata.statistics.query.totalBytesProcessed || '0', 10);
    const estimateGb = bytes / (1024 * 1024 * 1024);
    const costUsd = (estimateGb * 6.25) / 1000; // $6.25 per TB = $0.00625 per GB

    return {
      valid: true,
      bytesScanned: bytes,
      bytesScannedGb: Number.parseFloat(estimateGb.toFixed(6)),
      estimatedCostUsd: Number.parseFloat(costUsd.toFixed(8)),
    };
  } catch (e: any) {
    return {
      valid: false,
      error: e.message,
    };
  }
};

// 4. Execute Readonly Query (with Hard Caps & Security Validation)
export const executeReadonlyQuery = async (sql: string, context?: ToolContext) => {
  const maxBytesBilled = process.env.MAX_BYTES_BILLED || '10737418240'; // Default 10 GB

  // Build GCP job labels (lowercase alphanumeric, underscores, hyphens, max 63 chars)
  const rawEmail = context?.userEmail || process.env.LOCAL_USER_EMAIL || 'developer_local';
  const sanitizedEmail = rawEmail
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 63);

  const rawAdapter = context?.adapterName || 'generic';
  const sanitizedAdapter = rawAdapter
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 63);

  const [job] = await bigquery.createQueryJob({
    query: sql,
    maximumBytesBilled: maxBytesBilled,
    labels: {
      user_email: sanitizedEmail,
      mcp_adapter: sanitizedAdapter,
    },
  });

  console.log(`[BigQuery] Executing job: ${job.id} with maxBytesBilled limit: ${maxBytesBilled}`);
  
  const rowLimit = Number.parseInt(process.env.ROW_LIMIT || '1000', 10);
  
  // Enforce Row capping at the client-side retrieval level
  const [rows] = await job.getQueryResults({
    maxResults: rowLimit,
  });

  const stats = job.metadata?.statistics?.query;
  const actualBytes = stats?.totalBytesBilled
    ? Number.parseInt(stats.totalBytesBilled, 10)
    : (stats?.totalBytesProcessed ? Number.parseInt(stats.totalBytesProcessed, 10) : 0);

  // Attach metadata to rows array for audit & budget consumption
  Object.defineProperty(rows, '_queryMeta', {
    value: {
      jobId: job.id,
      actualBytesBilled: actualBytes,
    },
    enumerable: false,
    configurable: true,
  });

  return rows;
};

// 5. Search Allowed Tables (Hybrid Metadata Search)
export const searchAllowedTables = async (keyword: string) => {
  const list = process.env.ALLOWLIST_TABLES || '';
  const tablesConfig = list.split(',').map(s => s.replace(/\s+/g, '')).filter(Boolean);
  const lowercaseKeyword = keyword.toLowerCase();
  
  // 1. Filter tables from allowlist matching the keyword
  const matchedConfigs = tablesConfig.filter(tableConfig => 
    tableConfig.toLowerCase().includes(lowercaseKeyword)
  );
  
  if (matchedConfigs.length === 0) {
    return {
      message: `No tables found in allowlist matching keyword "${keyword}".`
    };
  }
  
  // Limit search to a maximum of 5 tables to prevent oversized payload & rate-limiting
  const limitedConfigs = matchedConfigs.slice(0, 5);
  const results = [];
  
  for (const tableConfig of limitedConfigs) {
    const parts = tableConfig.split('.');
    const datasetId = parts.length === 3 ? parts[1] : parts[0];
    const tableId = parts.length === 3 ? parts[2] : parts[1];
    
    try {
      const schemaInfo = await describeTable(datasetId, tableId);
      results.push(schemaInfo);
    } catch (e: any) {
      results.push({
        table: tableConfig,
        error: `Failed to load schema: ${e.message}`
      });
    }
  }
  
  return {
    keyword,
    matchedCount: matchedConfigs.length,
    tables: results
  };
};
