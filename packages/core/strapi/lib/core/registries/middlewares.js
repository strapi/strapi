'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

/**
 * @typedef {import('./middlewares').Middleware} Middleware
 */

// TODO: move instantiation part here instead of in the server service
const middlewaresRegistry = () => {
  const middlewares = {};

  return {
    /**
     * Returns this list of registered middlewares uids
     * @returns {string[]}
     */
    keys() {
      return Object.keys(middlewares);
    },

    /**
     * Returns the instance of a middleware. Instantiate the middleware if not already done
     * @param {string} uid
     * @returns {Middleware}
     */
    get(uid) {
      return middlewares[uid];
    },

    /**
     * Returns a map with all the middlewares in a namespace
     * @param {string} namespace
     * @returns {{ [key: string]: Middleware }}
     */
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(middlewares);
    },

    /**
     * Registers a middleware
     * @param {string} uid
     * @param {Middleware} middleware
     */
    set(uid, middleware) {
      middlewares[uid] = middleware;
      return this;
    },

    /**
     * Registers a map of middlewares for a specific namespace
     * @param {string} namespace
     * @param {{ [key: string]: Middleware }} newMiddlewares
     * @returns
     */
    add(namespace, rawMiddlewares) {
      for (const middlewareName of Object.keys(rawMiddlewares)) {
        const middleware = rawMiddlewares[middlewareName];
        const uid = addNamespace(middlewareName, namespace);

        if (has(uid, middlewares)) {
          throw new Error(`Middleware ${uid} has already been registered.`);
        }
        middlewares[uid] = middleware;
      }
    },

    /**
     * Wraps a middleware to extend it
     * @param {string} uid
     * @param {(middleware: Middleware) => Middleware} extendFn
     */
    extend(uid, extendFn) {
      const currentMiddleware = this.get(uid);

      if (!currentMiddleware) {
        throw new Error(`Middleware ${uid} doesn't exist`);
      }

      const newMiddleware = extendFn(currentMiddleware);
      middlewares[uid] = newMiddleware;

      return this;
    },
  };
};

module.exports = middlewaresRegistry;
