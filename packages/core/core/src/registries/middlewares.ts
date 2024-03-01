import { pickBy, has } from 'lodash/fp';
import type { Core, UID } from '@strapi/types';
import { addNamespace, hasNamespace } from './namespace';

type MiddlewareExtendFn = (middleware: Core.Middleware) => Core.Middleware;

// TODO: move instantiation part here instead of in the server service
const middlewaresRegistry = () => {
  const middlewares: Record<UID.Middleware, Core.Middleware> = {};

  return {
    /**
     * Returns this list of registered middlewares uids
     */
    keys() {
      return Object.keys(middlewares);
    },

    /**
     * Returns the instance of a middleware. Instantiate the middleware if not already done
     */
    get(uid: UID.Middleware) {
      return middlewares[uid];
    },

    /**
     * Returns a map with all the middlewares in a namespace
     */
    getAll(namespace: string) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(middlewares);
    },

    /**
     * Registers a middleware
     */
    set(uid: UID.Middleware, middleware: Core.Middleware) {
      middlewares[uid] = middleware;
      return this;
    },

    /**
     * Registers a map of middlewares for a specific namespace
     */
    add(namespace: string, rawMiddlewares: Record<string, Core.Middleware> = {}) {
      for (const middlewareName of Object.keys(rawMiddlewares)) {
        const middleware = rawMiddlewares[middlewareName];
        const uid = addNamespace(middlewareName, namespace) as UID.Middleware;

        if (has(uid, middlewares)) {
          throw new Error(`Middleware ${uid} has already been registered.`);
        }
        middlewares[uid] = middleware;
      }
    },

    /**
     * Wraps a middleware to extend it
     */
    extend(uid: UID.Middleware, extendFn: MiddlewareExtendFn) {
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

export default middlewaresRegistry;
