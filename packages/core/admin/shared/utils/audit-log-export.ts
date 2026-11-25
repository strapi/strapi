export const AUDIT_LOG_EXPORT_EVENT = 'audit-log.export';

export const AUDIT_LOGS_EXPORT_UNTIL_HEADER = 'X-Audit-Logs-Export-Until';
export const AUDIT_LOGS_EXPORT_NEXT_CURSOR_HEADER = 'X-Audit-Logs-Export-Next-Cursor';
export const AUDIT_LOGS_EXPORT_PART_SIZE_HEADER = 'X-Audit-Logs-Export-Part-Size';
export const AUDIT_LOGS_EXPORT_TOKEN_HEADER = 'X-Audit-Logs-Export-Token';
export const AUDIT_LOGS_EXPORT_CURSOR_DONE = 'none';
export const AUDIT_LOGS_EXPORT_PART_ROWS = 50000;
export const AUDIT_LOGS_EXPORT_PART_MAX_ROWS = 100000;
export const AUDIT_LOGS_EXPORT_DEFAULT_MAX_ROWS = 1_000_000;
