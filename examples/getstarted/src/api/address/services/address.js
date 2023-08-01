const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::address.address', {
  async find(coucou) {
    return [{ coucou }];
  }
});
