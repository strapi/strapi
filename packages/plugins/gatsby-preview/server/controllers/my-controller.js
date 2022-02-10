'use strict';

module.exports = {
  index(ctx) {
    ctx.body = strapi
      .plugin('plugin-gatsby-preview')
      .service('myService')
      .getWelcomeMessage();
  },
};
