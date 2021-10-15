'use strict';

/**
 * @typedef {import('@strapi/strapi').StrapiAppContext} StrapiAppContext
 */

const { defaultsDeep } = require('lodash/fp');

const defaults = {
  poweredBy: 'Strapi <strapi.io>',
};

/**
 * @param {any} config
 */
module.exports = config => {
  const { poweredBy } = defaultsDeep(defaults, config);

  /**
   * @param {StrapiAppContext} ctx
   * @param {() => Promise<void>} next
   */
  return async (ctx, next) => {
    await next();

    ctx.set('X-Powered-By', poweredBy);
  };
};
