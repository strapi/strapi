'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 * @typedef {import('@strapi/strapi').StrapiAppContext} StrapiAppContext
 */

const chalk = require('chalk');

/**
 * @param {number} code
 */
const codeToColor = code => {
  return code >= 500
    ? chalk.red(code)
    : code >= 400
    ? chalk.yellow(code)
    : code >= 300
    ? chalk.cyan(code)
    : code >= 200
    ? chalk.green(code)
    : code;
};

/**
 * @param {any} _
 * @param {{ strapi: Strapi}} ctx
 */
module.exports = (_, { strapi }) => {
  /**
   * @param {StrapiAppContext} ctx
   * @param {() => Promise<void>} next
   */
  return async (ctx, next) => {
    const start = Date.now();
    await next();
    const delta = Math.ceil(Date.now() - start);

    strapi.log.http(`${ctx.method} ${ctx.url} (${delta} ms) ${codeToColor(ctx.status)}`);
  };
};
