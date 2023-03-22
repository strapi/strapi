'use strict';

const { validateFindMany } = require('../validation/audit-logs');

module.exports = {
  async findMany(ctx) {
    const { query } = ctx.request;
    await validateFindMany(query);

    const auditLogs = strapi.container.get('audit-logs');
    const body = await auditLogs.findMany(query);

    ctx.body = body;
  },

  async findOne(ctx) {
    const { id } = ctx.params;

    const auditLogs = strapi.container.get('audit-logs');
    const body = await auditLogs.findOne(id);

    ctx.body = body;
  },
};
