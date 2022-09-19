const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::address.address', {
  async find(ctx) {
    const { results } = await strapi.service('api::address.address').find();

    ctx.body = await this.sanitizeOutput(results);
  },
});
