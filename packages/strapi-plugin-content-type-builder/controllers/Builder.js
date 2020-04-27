'use strict';

module.exports = {
  getReservedNames(ctx) {
    ctx.body = strapi.db.getRestrictedNames();
  },
};
