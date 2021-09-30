'use strict';

module.exports = {
  index(ctx) {
    ctx.body = strapi
      .plugin('super-plugin')
      .service('myService')
      .getWelcomeMessage();
  },
};
