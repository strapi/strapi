'use strict';

const { propOr } = require('lodash/fp');

const getMiddlewareConfig = propOr([], 'config.middlewares');

const resolveMiddlewares = route => {
  const middlewaresConfig = getMiddlewareConfig(route);

  return middlewaresConfig.map(middlewareConfig => middlewareConfig);
};

module.exports = {
  resolveMiddlewares,
};
