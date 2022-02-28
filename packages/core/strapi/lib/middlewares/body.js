'use strict';

const fse = require('fs-extra');
const { defaultsDeep, get } = require('lodash/fp');
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

    // clean any file that was uploaded
    const files = get('request.files.files', ctx);
    if (files) {
      if (Array.isArray(files)) {
        // not awaiting to not slow the request
        Promise.all(files.map(file => fse.remove(file.path)));
      } else if (files && files.path) {
        // not awaiting to not slow the request
        fse.remove(files.path);
      }
      delete ctx.request.files;
    }
  };
};
