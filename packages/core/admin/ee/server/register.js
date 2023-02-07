'use strict';

const { omit, isEqual } = require('lodash/fp');
const { features } = require('@strapi/strapi/lib/utils/ee');
const executeCERegister = require('../../server/register');
const createAuditLogsService = require('./services/audit-logs');

// Migrate the audit logs table name for users coming from v4.6.0
const migrateAuditLogsTable = async ({ oldContentTypes, contentTypes }) => {
  // Check if the audit logs table name was changed
  const oldName = oldContentTypes?.['admin::audit-log']?.collectionName;
  const newName = contentTypes['admin::audit-log']?.collectionName;
  const isMigratingTable = oldName === 'audit_logs' && newName === 'strapi_audit_logs';

  if (!isMigratingTable) {
    return;
  }

  // Make sure the schemas are equal to avoid potential collisions
  const schemasAreEqual = isEqual(
    omit(['collectionName'], oldContentTypes['admin::audit-log'].__schema__),
    omit(['collectionName'], contentTypes['admin::audit-log'].__schema__)
  );

  if (!schemasAreEqual) {
    return;
  }

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
