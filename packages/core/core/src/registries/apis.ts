import { has } from 'lodash';
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
    add(apiName: string, apiConfig: unknown) {
      if (has(apis, apiName)) {
        throw new Error(`API ${apiName} has already been registered.`);
      }

      const api = strapi.get('modules').add(`api::${apiName}`, apiConfig);

      apis[apiName] = api;

      return apis[apiName];
    },
  };
};

export default apisRegistry;
