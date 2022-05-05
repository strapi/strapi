'use strict';

const fse = require('fs-extra');
const { defaultsDeep, get } = require('lodash/fp');
const body = require('koa-body');
const mime = require('mime-types');

const defaults = {
  multipart: true,
  patchKoa: true,
};

function ensureType(file) {
  if (!file.type) {
    file.type = mime.lookup(file.name);
  }
}

function getFiles(ctx) {
  return get('request.files.files', ctx);
}

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = config => {
  const bodyConfig = defaultsDeep(defaults, config);

  return async (ctx, next) => {
    // TODO: find a better way later
    if (ctx.url === '/graphql') {
      await next();
    } else {
      try {
        await body({ patchKoa: true, ...bodyConfig })(ctx, () => {});

        const files = getFiles(ctx);

        if (files) {
          if (Array.isArray(files)) {
            files.forEach(ensureType);
          } else {
            ensureType(files);
          }
        }

        await next();
      } catch (e) {
        if ((e || {}).message && e.message.includes('maxFileSize exceeded')) {
          return ctx.payloadTooLarge('FileTooBig');
        }

        throw e;
      }
    }

    const files = getFiles(ctx);

    // clean any file that was uploaded
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
