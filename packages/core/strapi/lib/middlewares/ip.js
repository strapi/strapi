'use strict';

const ip = require('koa-ip');

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = config => ip(config);
