'use strict';

/**
 * Read the documentation () to implement custom controller functions
 */

module.exports = {
  async find(ctx) {
    return await strapi.query('articles').find(ctx.query);
  },
};
