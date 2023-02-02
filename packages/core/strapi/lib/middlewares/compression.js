'use strict';

const compress = require('koa-compress');

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = (config) => compress(config);
