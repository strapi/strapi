/**
 * These are the EE exports for the admin app.
 */

export { useLicenseLimits } from '../../ee/admin/src/hooks/useLicenseLimits';
export { useEnterprise } from './hooks/useEnterprise';
export { useGetAiUsageQuery, useGetAiFeatureConfigQuery } from '../../ee/admin/src/services/ai';
export { useAIAvailability } from '../../ee/admin/src/hooks/useAIAvailability';

export {
  registerAuditLogTableColumn,
  registerAuditLogFilter,
  type AuditLogTableColumn,
  type AuditLogFilter,
  type AuditLogFilterContext,
} from '../../ee/admin/src/pages/SettingsPage/pages/AuditLogs/audit-logs-plugin';
