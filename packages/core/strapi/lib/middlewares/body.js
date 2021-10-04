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
module.exports = (config, { strapi }) => {
  const bodyConfig = defaultsDeep(defaults, config);

  return async (ctx, next) => {
    // TODO: find a better way later
    if (ctx.url === '/graphql') {
      return next();
    }

    try {
      return body({ patchKoa: true, ...bodyConfig })(ctx, next);
    } catch (e) {
      if ((e || {}).message && e.message.includes('maxFileSize exceeded')) {
        throw strapi.errors.entityTooLarge('FileTooBig', {
          errors: [
            {
              id: 'parser.file.status.sizeLimit',
              message: `file is bigger than the limit size!`,
            },
          ],
        });
      }

      throw e;
    }
  };
};
