'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 * @typedef {import('@strapi/strapi').StrapiAppContext} StrapiAppContext
 */

const { defaultsDeep } = require('lodash/fp');
const body = require('koa-body');

const defaults = {
  multipart: true,
  patchKoa: true,
};

/**
 * @param {body.IKoaBodyOptions} config
 * @param {{ strapi: Strapi }} ctx
 */
module.exports = (config, { strapi }) => {
  const bodyConfig = defaultsDeep(defaults, config);

  /**
   * @param {StrapiAppContext} ctx
   * @param {() => Promise<void>} next
   */
  return async (ctx, next) => {
    // TODO: find a better way later
    if (ctx.url === '/graphql') {
      return next();
    }

    try {
      return body({ patchKoa: true, ...bodyConfig })(ctx, next);
    } catch (/** @type {any} **/ e) {
      if ((e || {}).message && e.message.includes('maxFileSize exceeded')) {
        if (!strapi.errors) {
          throw new Error(`FileTooBig: file is bigger than the limit size!`);
        }

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
