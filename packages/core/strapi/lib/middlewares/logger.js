'use strict';

/**
 * @typedef {import('types').Strapi} Strapi
 */

const chalk = require('chalk');

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
  return async (ctx, next) => {
    const start = Date.now();
    await next();
    const delta = Math.ceil(Date.now() - start);

    strapi.log.http(`${ctx.method} ${ctx.url} (${delta} ms) ${codeToColor(ctx.status)}`);
  };
};
