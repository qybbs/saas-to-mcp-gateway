import { isTableAllowlisted } from './bigquery';
// SQL Policy Engine: Strips comments, checks read-only SELECT, blocks DML/DDL, and checks allowlisted tables
export const validateQuerySafety = (sql: string): { safe: boolean; reason?: string; detectedTables: string[] } => {
  const cleanSql = sql.trim().toLowerCase();
  
  // 1. Remove comments (both block /* */ and inline -- comments) to prevent evasion without backtracking
  const sqlWithoutComments = cleanSql.replace(/\/\*(?:\*[^\/]|[^*])*\*\/|--.*/g, '').trim();
  
  // 2. Strip backticks to simplify matching and prevent backtracking
  const sqlCleaned = sqlWithoutComments.replace(/`/g, '');
  
  // Matches either `dataset.table`, `project.dataset.table`
  const pattern = /\b([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)(?:\.([a-zA-Z0-9_-]+))?\b/g;
  let match;
  const detectedTables: string[] = [];
  while ((match = pattern.exec(sqlCleaned)) !== null) {
    const dataset = match[3] ? match[2] : match[1];
    const table = match[3] ? match[3] : match[2];
    detectedTables.push(`${dataset}.${table}`);
  }

  // 3. Must start with SELECT or WITH ... SELECT
  if (!sqlWithoutComments.startsWith('select') && !sqlWithoutComments.startsWith('with')) {
    return { safe: false, reason: 'Only SELECT (or WITH ... SELECT) queries are allowed.', detectedTables };
  }

  // 4. Denylist DDL/DML/Scripting keywords
  const forbiddenKeywords = [
    'insert', 'update', 'delete', 'merge', 'create', 'drop', 'alter',
    'truncate', 'grant', 'revoke', 'declare', 'execute immediate', 'call'
  ];
  for (const word of forbiddenKeywords) {
    const regex = new RegExp(String.raw`\b${word}\b`, 'i');
    if (regex.test(sqlWithoutComments)) {
      return { safe: false, reason: `Query contains forbidden keyword: "${word}"`, detectedTables };
    }
  }

  // 5. Table Allowlist verification
  if (detectedTables.length === 0) {
    return { safe: false, reason: 'Unable to detect referenced table. Ensure table format is `dataset.table`.', detectedTables };
  }

  for (const table of detectedTables) {
    const parts = table.split('.');
    if (!isTableAllowlisted(parts[0], parts[1])) {
      return { safe: false, reason: `Table "${table}" is not in the allowlist.`, detectedTables };
    }
  }

  return { safe: true, detectedTables };
};
