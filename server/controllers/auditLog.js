'useT strict';

module.exports = {
  async find(ctx) {
    try {
      // ctx.query already contains all filters, sort, and pagination parameters
      // e.g., /audit-logs?filters[action][$eq]=create&sort=createdAt:desc
      const data = await strapi
        .service('plugin::audit-log.audit-log')
        .find(ctx.query);

      ctx.body = data;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
};
