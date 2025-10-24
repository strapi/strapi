'use strict';

module.exports = {
  async find(ctx) {
    const { query } = ctx;
    const auditService = strapi.plugin('audit-logs').service('auditLog');

    const result = await auditService.find(query);
    ctx.body = result;
  },
};

