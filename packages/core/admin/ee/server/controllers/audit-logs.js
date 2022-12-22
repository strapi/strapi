'use strict';

module.exports = {
  async getAuditLogs(ctx) {
    const auditLogs = strapi.container.get('audit-logs');

    const results = await auditLogs.getAll();

    ctx.body = {
      data: results,
    };
  },
};
