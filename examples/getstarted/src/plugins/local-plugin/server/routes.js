const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = {
  test: createCoreRouter('plugin::myplugin.test', {
    type: 'content-api',
    only: ['find', 'findOne'],
  }),
};
