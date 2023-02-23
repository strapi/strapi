'use strict';

const { features } = require('@strapi/strapi/lib/utils/ee');
const executeCERegister = require('../../server/register');
const migrateAuditLogsTable = require('./migrations/audit-logs-table');
const createAuditLogsService = require('./services/audit-logs');

module.exports = async ({ strapi }) => {
  const auditLogsIsAllowed = features.isEnabled('audit-logs');
  const auditLogsIsEnabled = strapi.config.get('server.auditLogs.enabled', true);

  if (auditLogsIsAllowed && auditLogsIsEnabled) {
    strapi.hook('strapi::content-types.beforeSync').register(migrateAuditLogsTable);
    const auditLogsService = createAuditLogsService(strapi);
    strapi.container.register('audit-logs', auditLogsService);
    await auditLogsService.register();
  }

  await executeCERegister({ strapi });
};
