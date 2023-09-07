import { createAPI } from './api';
import type { Strapi } from '@strapi/typings';

const createAdminAPI = (strapi: Strapi) => {
  const opts = {
    prefix: '', // '/admin';
    type: 'admin',
  };

  return createAPI(strapi, opts);
};

export { createAdminAPI };
