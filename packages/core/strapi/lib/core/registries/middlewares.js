'use strict';

const { pickBy, has } = require('lodash/fp');

const middlewaresRegistry = () => {
  const middlewares = {};

  return {
    get(middlewareUID) {
      return middlewares[middlewareUID];
    },
    getAll(prefix = '') {
      return pickBy((middleware, middlewareUID) => middlewareUID.startsWith(prefix))(middlewares);
    },
    add(namespace, middlewares) {
      for (const middlewareName in middlewares) {
        const middleware = middlewares[middlewareName];
        const uid = `${namespace}.${middlewareName}`;

        if (has(uid, middlewares)) {
          throw new Error(`Middleware ${uid} has already been registered.`);
        }
        middlewares[uid] = middleware;
      }
    },
  };
};

module.exports = middlewaresRegistry;
