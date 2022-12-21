'use strict';

const { features } = require('@strapi/strapi/lib/utils/ee');
const executeCERegister = require('../../server/register');
const createAuditLogsService = require('./services/audit-logs');

module.exports = async ({ strapi }) => {
  if (features.isEnabled('audit-logs')) {
    const auditLogsService = createAuditLogsService(strapi);
    strapi.container.register('audit-logs', auditLogsService);
    auditLogsService.register();
  }

  executeCERegister({ strapi });
};
