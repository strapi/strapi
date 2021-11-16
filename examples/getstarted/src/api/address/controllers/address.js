const { createCoreController } = require('@strapi/strapi').factories;

// NOTE: should the file name  be useless ? if we use the uid we should generate the controller with the same uid instead ?

module.exports = createCoreController('api::address.address', {
  async find(ctx) {
    const { results } = await strapi.service('api::address.address').find();
    ctx.body = await this.sanitizeOutput(results);
  },
});
