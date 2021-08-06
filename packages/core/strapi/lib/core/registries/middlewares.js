'use strict';

const { pickBy, has } = require('lodash/fp');

const middlewaresRegistry = () => {
  const _middlewares = {};

  return {
    get(middlewareUID) {
      return _middlewares[middlewareUID];
    },
    getAll(prefix = '') {
      return pickBy((middleware, middlewareUID) => middlewareUID.startsWith(prefix))(_middlewares);
    },
    add(namespace, middlewares) {
      for (const middlewareName in middlewares) {
        const middleware = middlewares[middlewareName];
        const uid = `${namespace}.${middlewareName}`;

        if (has(uid, _middlewares)) {
          throw new Error(`Middleware ${uid} has already been registered.`);
        }
        _middlewares[uid] = middleware;
      }
    },
  };
};

module.exports = middlewaresRegistry;
