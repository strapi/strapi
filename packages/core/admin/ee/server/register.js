'use strict';

const { features } = require('@strapi/strapi/lib/utils/ee');
const executeCERegister = require('../../server/register');
const createAuditLogsService = require('./services/audit-logs');

// Migrate the audit logs table name for users coming from v4.6.0
const migrateAuditLogsTable = async ({ oldContentTypes, contentTypes }) => {
  // Check if the audit logs table name was changed
  const oldName = oldContentTypes?.['admin::audit-log']?.collectionName;
  const newName = contentTypes['admin::audit-log']?.collectionName;
  const hasRenamedAuditLogsTable = oldName === 'audit_logs' && newName === 'strapi_audit_logs';

  if (!hasRenamedAuditLogsTable) {
    return;
  }

  // Check if the previous audit log tables exist
  const hasAuditLogsTable = await strapi.db.getSchemaConnection().hasTable('audit_logs');
  const hasLinkTable = await strapi.db.getSchemaConnection().hasTable('audit_logs_user_links');

  if (!hasAuditLogsTable || !hasLinkTable) {
    return;
  }

  // Check if the existing tables match the expected schema
  const auditLogsColumnInfo = await strapi.db.connection('audit_logs').columnInfo();
  const linkColumnInfo = await strapi.db.connection('audit_logs_user_links').columnInfo();

  if (
    !auditLogsColumnInfo.action ||
    !auditLogsColumnInfo.date ||
    !auditLogsColumnInfo.payload ||
    !linkColumnInfo.audit_log_id ||
    !linkColumnInfo.user_id
  ) {
    return;
  }

  // Do the actual migrations
  await strapi.db.getSchemaConnection().renameTable('audit_logs', 'strapi_audit_logs');
  await strapi.db
    .getSchemaConnection()
    .renameTable('audit_logs_user_links', 'strapi_audit_logs_user_links');
};

module.exports = async ({ strapi }) => {
  if (features.isEnabled('audit-logs')) {
    strapi.hook('strapi::content-types.beforeSync').register(migrateAuditLogsTable);
    const auditLogsService = createAuditLogsService(strapi);
    strapi.container.register('audit-logs', auditLogsService);
    await auditLogsService.register();
  }

  await executeCERegister({ strapi });
};
