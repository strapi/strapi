'use strict';

const compress = require('koa-compress');

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = options => compress(options);
