'use strict';

const { validateFindMany } = require('../validation/audit-logs');

module.exports = {
  async getAuditLogs(ctx) {
    const { query } = ctx.request;
    await validateFindMany(query);

    const auditLogs = strapi.container.get('audit-logs');
    const body = await auditLogs.findMany(query);

    ctx.body = body;
  },
};
