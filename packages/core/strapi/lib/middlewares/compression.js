'use strict';

const compress = require('koa-compress');

module.exports = config => compress(config);
