'use strict';

const defaults = {
  poweredBy: 'Strapi <strapi.io>',
};

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = options => {
  const { poweredBy } = Object.assign({}, defaults, options);

  return async (ctx, next) => {
    await next();

    ctx.set('X-Powered-By', poweredBy);
  };
};
