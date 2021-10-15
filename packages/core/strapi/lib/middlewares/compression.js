'use strict';

const compress = require('koa-compress');

/**
 * @param {compress.CompressOptions} config
 */
module.exports = config => compress(config);
