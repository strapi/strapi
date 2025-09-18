import { has } from 'lodash/fp';
import type { Core } from '@strapi/types';

const apisRegistry = (strapi: Core.Strapi) => {
  const apis: Record<string, unknown> = {};

  return {
    get(name: string) {
      return apis[name];
    },
    getAll() {
      return apis;
    },
    add(apiName: string, apiConfig: unknown, options?: { force?: boolean }) {
      if (has(apiName, apis) && !options?.force) {
        throw new Error(`API ${apiName} has already been registered.`);
      }

      const api = strapi.get('modules').add(`api::${apiName}`, apiConfig);

      apis[apiName] = api;

      return apis[apiName];
    },

    /**
     * Removes a given API namespace; used to rebuild from disk
     */
    remove(apiName: string) {
      delete apis[apiName];
      return this;
    },

    /**
     * Clears all APIs
     */
    clear() {
      for (const key of Object.keys(apis)) {
        delete apis[key];
      }
      return this;
    },

    /**
     * Removes APIs whose name starts with the given prefix
     */
    removePrefix(prefix: string) {
      for (const key of Object.keys(apis)) {
        if (key.startsWith(prefix)) {
          delete apis[key];
        }
      }
      return this;
    },
  };
};

export default apisRegistry;
