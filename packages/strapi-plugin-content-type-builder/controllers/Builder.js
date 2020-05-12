'use strict';

module.exports = {
  getReservedNames(ctx) {
    ctx.body = strapi.plugins['content-type-builder'].services.builder.getReservedNames();
  },
};
