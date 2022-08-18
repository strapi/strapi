const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::address.address', {
  async find(...args) {
    const { results, pagination } = await super.find(...args);

    results.forEach((result) => {
      result.counter = 1;
    });

    return { results, pagination };
  },
});
