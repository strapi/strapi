'use strict';

const compress = require('koa-compress');

module.exports = (options = {}) => compress(options);
