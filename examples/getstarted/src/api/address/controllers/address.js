const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::address.address', ({ strapi }) => ({
  async find(ctx) {
    const { query } = ctx;

    const { results, pagination } = await strapi.service('api::address.address').find(query);
    const sanitizedResults = await this.sanitizeOutput(results, ctx);

    return this.transformResponse(sanitizedResults, { pagination });
  },

  async findOne(ctx) {
    // use the parent controller
    return super.findOne(ctx);
  },
}));
