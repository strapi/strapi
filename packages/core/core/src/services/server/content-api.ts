import type { Core } from '@strapi/types';
import { createAPI } from './api';

const createContentAPI = (strapi: Core.Strapi) => {
  const opts = {
    prefix: strapi.config.get('api.rest.prefix', '/api'),
    type: 'content-api',
  };

  return createAPI(strapi, opts);
};

export { createContentAPI };
