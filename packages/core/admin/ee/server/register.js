'use strict';

const { features } = require('@strapi/strapi/lib/utils/ee');
const executeCERegister = require('../../server/register');
const createAuditLogsService = require('./services/audit-logs');

// Migrate the audit logs table name for users coming from v4.6.0
const migrateAuditLogsTable = async ({ oldContentTypes, contentTypes }) => {
  // Check if the table name needs to be migrated
  const oldName = oldContentTypes?.['admin::audit-log']?.collectionName;
  const newName = contentTypes['admin::audit-log']?.collectionName;
  const shouldMigrate = oldName === 'audit_logs' && newName === 'strapi_audit_logs';

  if (shouldMigrate) {
    // Migrate the main audit logs table
    if (await strapi.db.getSchemaConnection().hasTable('audit_logs')) {
      await strapi.db.getSchemaConnection().renameTable('audit_logs', 'strapi_audit_logs');
    }

    // Migrate the link table
    if (await strapi.db.getSchemaConnection().hasTable('audit_logs_user_links')) {
      await strapi.db
        .getSchemaConnection()
        .renameTable('audit_logs_user_links', 'strapi_audit_logs_user_links');
    }
  }
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
