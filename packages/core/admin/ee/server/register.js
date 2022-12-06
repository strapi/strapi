'use strict';

const createAuditLogsService = require('./services/audit-logs');

module.exports = async ({ strapi }) => {
  strapi.auditLogs = createAuditLogsService(strapi);
};
