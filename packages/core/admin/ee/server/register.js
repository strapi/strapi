'use strict';

const executeCERegister = require('../../server/register');
const createAuditLogsService = require('./services/audit-logs');

module.exports = async ({ strapi }) => {
  strapi.auditLogs = createAuditLogsService(strapi);

  await executeCERegister({ strapi });
};
