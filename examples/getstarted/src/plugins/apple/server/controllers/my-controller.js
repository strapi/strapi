'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi.plugin('apple').service('myService').getWelcomeMessage();
  },
});
