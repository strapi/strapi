'use strict';

const { defaultsDeep } = require('lodash/fp');
const body = require('koa-body');

const defaults = {
  multipart: true,
  patchKoa: true,
};

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = config => {
  const bodyConfig = defaultsDeep(defaults, config);

  return async (ctx, next) => {
    // TODO: find a better way later
    if (ctx.url === '/graphql') {
      return next();
    }

    try {
      await body({ patchKoa: true, ...bodyConfig })(ctx, next);
    } catch (e) {
      if ((e || {}).message && e.message.includes('maxFileSize exceeded')) {
        return ctx.payloadTooLarge('FileTooBig');
      }

      throw e;
    }
  };
};
