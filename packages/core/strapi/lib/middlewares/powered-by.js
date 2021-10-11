'use strict';

const { defaultsDeep } = require('lodash/fp');

const defaults = {
  poweredBy: 'Strapi <strapi.io>',
};

module.exports = config => {
  const { poweredBy } = defaultsDeep(defaults, config);

  return async (ctx, next) => {
    await next();

    ctx.set('X-Powered-By', poweredBy);
  };
};
