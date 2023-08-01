import { createAPI } from './api';
import type { Strapi } from '../../Strapi';

const createContentAPI = (strapi: Strapi) => {
  const opts = {
    prefix: strapi.config.get('api.rest.prefix', '/api'),
    type: 'content-api',
  };

  return createAPI(strapi, opts);
};

export { createContentAPI };
