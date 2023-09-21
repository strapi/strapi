import type { Strapi } from '@strapi/types';
import { createAPI } from './api';

const createContentAPI = (strapi: Strapi) => {
  const opts = {
    prefix: strapi.config.get('api.rest.prefix', '/api'),
    type: 'content-api',
  };

  return createAPI(strapi, opts);
};

export { createContentAPI };
