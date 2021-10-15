'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

/**
 * @typedef {import('@strapi/strapi').StrapiMiddlewares} StrapiMiddlewares
 * @typedef {import('./types/middlewares').Middleware} Middleware
 */

// TODO: move instantiation part here instead of in the server service
const middlewaresRegistry = () => {
  /**
   * @type {StrapiMiddlewares}
   */
  // @ts-ignore
  const middlewares = {};

  return {
    /**
     * Returns this list of registered middlewares uids
     */
    keys() {
      return Object.keys(middlewares);
    },

    /**
     * Returns the instance of a middleware. Instantiate the middleware if not already done
     * @template {keyof StrapiMiddlewares} T
     * @param {T} uid
     */
    get(uid) {
      return middlewares[uid];
    },

    /**
     * Returns a map with all the middlewares in a namespace
     * @param {string=} namespace
     * @returns {Record<string, Middleware>}
     */
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(middlewares);
    },

    /**
     * Registers a middleware
     * @template {keyof StrapiMiddlewares} T
     * @param {T} uid
     * @param {Middleware} middleware
     */
    set(uid, middleware) {
      // @ts-ignore
      middlewares[uid] = middleware;
      return this;
    },

    /**
     * Registers a map of middlewares for a specific namespace
     * @param {string} namespace
     * @param {Record<string, Middleware>} rawMiddlewares
     */
    add(namespace, rawMiddlewares) {
      for (const middlewareName in rawMiddlewares) {
        const middleware = rawMiddlewares[middlewareName];
        const uid = addNamespace(middlewareName, namespace);

        if (has(uid, middlewares)) {
          throw new Error(`Middleware ${uid} has already been registered.`);
        }
        // @ts-ignore
        middlewares[uid] = middleware;
      }
    },

    /**
     * Wraps a middleware to extend it
     * @template {keyof StrapiMiddlewares} T
     * @param {T} uid
     * @param {(middleware: Middleware) => Middleware} extendFn
     */
    extend(uid, extendFn) {
      const currentMiddleware = this.get(uid);

      if (!currentMiddleware) {
        throw new Error(`Middleware ${uid} doesn't exist`);
      }

      const newMiddleware = extendFn(currentMiddleware);
      return this.set(uid, newMiddleware);
    },
  };
};

module.exports = middlewaresRegistry;
