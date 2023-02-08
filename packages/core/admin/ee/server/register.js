'use strict';

const { features } = require('@strapi/strapi/lib/utils/ee');
const executeCERegister = require('../../server/register');
const migrateAuditLogsTable = require('./migrations/audit-logs-table');
const createAuditLogsService = require('./services/audit-logs');

module.exports = async ({ strapi }) => {
  if (features.isEnabled('audit-logs')) {
    strapi.hook('strapi::content-types.beforeSync').register(migrateAuditLogsTable);
    const auditLogsService = createAuditLogsService(strapi);
    strapi.container.register('audit-logs', auditLogsService);
    await auditLogsService.register();
  }

  await executeCERegister({ strapi });
};
