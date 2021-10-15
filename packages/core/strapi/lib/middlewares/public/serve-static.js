'use strict';

/**
 * @typedef {import('@strapi/strapi').StrapiAppContext} StrapiAppContext
 */

const path = require('path');
const koaStatic = require('koa-static');

/**
 * serveStatic is not supposed to be used to serve a folder that have sub-folders
 *
 * @param {string} filesDir
 * @param {koaStatic.Options} koaStaticOptions
 */
const serveStatic = (filesDir, koaStaticOptions = {}) => {
  const serve = koaStatic(filesDir, koaStaticOptions);
  /**
   * @param {StrapiAppContext} ctx
   * @param {() => Promise<void>} next
   */
  return async (ctx, next) => {
    const prev = ctx.path;
    const newPath = path.basename(ctx.path);
    ctx.path = newPath;
    await serve(ctx, async () => {
      ctx.path = prev;
      await next();
      ctx.path = newPath;
    });
    ctx.path = prev;
  };
};

module.exports = serveStatic;
