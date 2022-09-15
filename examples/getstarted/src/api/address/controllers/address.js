const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::address.address', {
  async find(ctx) {
    // const { results } = await strapi.service('api::address.address').find();

    const r = await strapi.db.query('api::address.address').load(
      {
        id: 1,
      },
      'categories',
      {
        limit: 2,
        orderBy: 'asc|desc',
      }
    );

    console.log(r);

    ctx.body = r;

    // ctx.body = await this.sanitizeOutput(results);
  },
});
