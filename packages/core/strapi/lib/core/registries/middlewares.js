'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

const middlewaresRegistry = () => {
  const middlewares = {};

  return {
    get(middlewareUID) {
      return middlewares[middlewareUID];
    },
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(middlewares);
    },
    add(namespace, rawMiddlewares) {
      for (const middlewareName in rawMiddlewares) {
        const middleware = rawMiddlewares[middlewareName];
        const uid = addNamespace(middlewareName, namespace);

        if (has(uid, middlewares)) {
          throw new Error(`Middleware ${uid} has already been registered.`);
        }
        middlewares[uid] = middleware;
      }
    },
  };
};

module.exports = middlewaresRegistry;
