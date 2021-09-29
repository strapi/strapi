'use strict';

const { propOr } = require('lodash/fp');

const resolveMiddlewares = propOr([], 'config.middlewares');

module.exports = {
  resolveMiddlewares,
};
