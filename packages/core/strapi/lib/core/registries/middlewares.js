'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');
const { BaseRegistry } = require('./base');

/**
 * @typedef {import('./middlewares').Middleware} Middleware
 */

class MiddlewaresRegistry extends BaseRegistry {
  constructor(strapi) {
    super(strapi);
    this.middlewares = {};
  }
  /**
   * Returns this list of registered middlewares uids
   * @returns {string[]}
   */
  keys() {
    return Object.keys(this.middlewares);
  }

  /**
   * Returns the instance of a middleware. Instantiate the middleware if not already done
   * @param {string} uid
   * @returns {Middleware}
   */
  get(uid) {
    return this.middlewares[uid];
  }

  /**
   * Returns a map with all the middlewares in a namespace
   * @param {string} namespace
   * @returns {{ [key: string]: Middleware }}
   */
  getAll(namespace) {
    return pickBy((_, uid) => hasNamespace(uid, namespace))(this.middlewares);
  }

  /**
   * Registers a middleware
   * @param {string} uid
   * @param {Middleware} middleware
   */
  set(uid, middleware) {
    this.middlewares[uid] = middleware;
    return this;
  }

  /**
   * Registers a map of middlewares for a specific namespace
   * @param {string} namespace
   * @param {{ [key: string]: Middleware }} newMiddlewares
   * @returns
   */
  add(namespace, rawMiddlewares) {
    for (const middlewareName in rawMiddlewares) {
      const middleware = rawMiddlewares[middlewareName];
      const uid = addNamespace(middlewareName, namespace);

      if (has(uid, this.middlewares)) {
        throw new Error(`Middleware ${uid} has already been registered.`);
      }
      this.middlewares[uid] = middleware;
    }
  }

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
    this.middlewares[uid] = newMiddleware;

    return this;
  }
}

// TODO: move instantiation part here instead of in the server service
const createMiddlewaresRegistry = strapi => {
  return new MiddlewaresRegistry(strapi);
};

module.exports = createMiddlewaresRegistry;
module.exports.MiddlewaresRegistry = MiddlewaresRegistry;
