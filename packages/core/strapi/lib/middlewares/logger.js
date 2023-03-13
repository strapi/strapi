'use strict';

/* eslint-disable no-nested-ternary */

const chalk = require('chalk');

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = (_, { strapi }) => {
  return async (ctx, next) => {
    const start = Date.now();
    await next();
    const delta = Math.ceil(Date.now() - start);

    strapi.log.http(`${ctx.method} ${ctx.url} (${delta} ms) ${ctx.status}`);
  };
};
