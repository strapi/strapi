import { has } from 'lodash/fp';
import type { Strapi } from '@strapi/types';

const apisRegistry = (strapi: Strapi) => {
  const apis: Record<string, unknown> = {};

  return {
    get(name: string) {
      return apis[name];
    },
    getAll() {
      return apis;
    },
    add(apiName: string, apiConfig: unknown) {
      if (has(apiName, apis)) {
        throw new Error(`API ${apiName} has already been registered.`);
      }

      const api = strapi.container.get('modules').add(`api::${apiName}`, apiConfig);

      apis[apiName] = api;

      return apis[apiName];
    },
  };
};

export default apisRegistry;
