'use strict';

module.exports = {
  index(ctx) {
    ctx.body = strapi
      .plugin('test')
      .service('myService')
      .getWelcomeMessage();
  },
};
