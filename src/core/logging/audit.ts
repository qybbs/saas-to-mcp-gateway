import { EventEmitter } from 'events';

export const sanitizeLogString = (val: any): string => {
  if (val === undefined || val === null) return '';
  return String(val).replace(/[\r\n]/g, '');
};

export interface AuditLogRecord {
  timestamp: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  audit: {
    requestId: string;
    userEmail: string;
    adapterName?: string;
    toolName: string;
    status: 'SUCCESS' | 'FAILED' | 'REJECTED';
    durationMs?: number;
    denialReason?: string;
    error?: string;
    [key: string]: any;
  };
}

export interface GatewayMetrics {
  totalRequests: number;
  successCount: number;
  failedCount: number;
  rejectedCount: number;
  rpm: number;
  avgLatencyMs: number;
  totalBytesBilled: number;
  driverCallCounts: Record<string, number>;
  uptimeSeconds: number;
}

// Global Event Emitter for live streaming to dashboard SSE clients
export const auditEmitter = new EventEmitter();
// Allow multiple dashboard clients to listen without node warning
auditEmitter.setMaxListeners(100);

const MAX_AUDIT_HISTORY = 500;
const auditHistory: AuditLogRecord[] = [];

// Telemetry counters
let totalRequests = 0;
let successCount = 0;
let failedCount = 0;
let rejectedCount = 0;
let totalDurationMs = 0;
let totalRequestsWithDuration = 0;
let totalBytesBilled = 0;
const driverCallCounts: Record<string, number> = {};
const rollingRequestTimestamps: number[] = [];
const startTime = Date.now();

export const writeAuditLog = (log: {
  requestId: string | number;
  userEmail: string;
  adapterName?: string;
  toolName: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  durationMs?: number;
  denialReason?: string;
  error?: string;
  metadata?: Record<string, any>;
}) => {
  const safeUserEmail = sanitizeLogString(log.userEmail);
  const safeToolName = sanitizeLogString(log.toolName);
  const safeStatus = sanitizeLogString(log.status) as 'SUCCESS' | 'FAILED' | 'REJECTED';
  const safeAdapterName = log.adapterName ? sanitizeLogString(log.adapterName) : undefined;

  let severity: 'ERROR' | 'WARNING' | 'INFO' = 'INFO';
  if (log.status === 'FAILED') {
    severity = 'ERROR';
  } else if (log.status === 'REJECTED') {
    severity = 'WARNING';
  }

  const durationMs = typeof log.durationMs === 'number' ? Math.max(0, Math.round(log.durationMs)) : undefined;

  const auditLogEntry: AuditLogRecord = {
    timestamp: new Date().toISOString(),
    severity,
    message: `[MCP AUDIT] ${safeUserEmail} executed ${safeToolName} - ${safeStatus}${durationMs !== undefined ? ` (${durationMs}ms)` : ''}`,
    audit: {
      requestId: sanitizeLogString(log.requestId),
      userEmail: safeUserEmail,
      adapterName: safeAdapterName,
      toolName: safeToolName,
      status: safeStatus,
      durationMs,
      denialReason: log.denialReason ? sanitizeLogString(log.denialReason) : undefined,
      error: log.error ? sanitizeLogString(log.error) : undefined,
      ...(log.metadata || {})
    },
  };

  // 1. Maintain in-memory circular ring buffer
  auditHistory.push(auditLogEntry);
  if (auditHistory.length > MAX_AUDIT_HISTORY) {
    auditHistory.shift();
  }

  // 2. Update telemetry metrics
  totalRequests++;
  const now = Date.now();
  rollingRequestTimestamps.push(now);

  if (log.status === 'SUCCESS') successCount++;
  else if (log.status === 'FAILED') failedCount++;
  else if (log.status === 'REJECTED') rejectedCount++;

  if (durationMs !== undefined) {
    totalDurationMs += durationMs;
    totalRequestsWithDuration++;
  }

  // Track driver name if toolName is namespaced {driver}_{tool}
  if (safeToolName.includes('_')) {
    const driver = safeToolName.split('_')[0];
    driverCallCounts[driver] = (driverCallCounts[driver] || 0) + 1;
  }

  if (log.metadata) {
    if (typeof log.metadata.actualBytesBilled === 'number') {
      totalBytesBilled += log.metadata.actualBytesBilled;
    } else if (typeof log.metadata.bytesProcessed === 'number') {
      totalBytesBilled += log.metadata.bytesProcessed;
    }
  }

  // 3. Emit live event to subscribers
  auditEmitter.emit('audit_log', auditLogEntry);

  // 4. Log structured JSON to stdout for Cloud Logging / Datadog
  console.log(JSON.stringify(auditLogEntry));
};

export const getAuditHistory = (limit: number = 100): AuditLogRecord[] => {
  const boundedLimit = Math.max(1, Math.min(limit, MAX_AUDIT_HISTORY));
  return auditHistory.slice(-boundedLimit).reverse();
};

export const clearAuditHistory = (): void => {
  auditHistory.length = 0;
};

export const getGatewayMetrics = (): GatewayMetrics => {
  const now = Date.now();
  // Filter timestamps within the last 60 seconds for live RPM calculation
  const oneMinuteAgo = now - 60000;
  while (rollingRequestTimestamps.length > 0 && rollingRequestTimestamps[0] < oneMinuteAgo) {
    rollingRequestTimestamps.shift();
  }

  const rpm = rollingRequestTimestamps.length;
  const avgLatencyMs = totalRequestsWithDuration > 0
    ? Math.round(totalDurationMs / totalRequestsWithDuration)
    : 0;
  const uptimeSeconds = Math.round((now - startTime) / 1000);

  return {
    totalRequests,
    successCount,
    failedCount,
    rejectedCount,
    rpm,
    avgLatencyMs,
    totalBytesBilled,
    driverCallCounts: { ...driverCallCounts },
    uptimeSeconds,
  };
};

export const resetGatewayMetrics = (): void => {
  totalRequests = 0;
  successCount = 0;
  failedCount = 0;
  rejectedCount = 0;
  totalDurationMs = 0;
  totalRequestsWithDuration = 0;
  totalBytesBilled = 0;
  rollingRequestTimestamps.length = 0;
  for (const key of Object.keys(driverCallCounts)) {
    delete driverCallCounts[key];
  }
};
