/**
 * Where an audited action originated. The audit-logs gate and the payload
 * label share this union so they stay exhaustive together.
 */
export type AuditSource = 'admin' | 'mcp';
