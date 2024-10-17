import type { Core } from '@strapi/types';
import { createAPI } from './api';

const createAdminAPI = (strapi: Core.Strapi) => {
  const opts = {
    // prefix is the base URL of the server api
    // it's relative to the server host
    // if we run the server as / (root) and admin panel on /admin it should be / (empty string)
    // if we run the server as subpath like /strapi and admin panel as a subpath like /strapi/admin it should be /strapi
    prefix: strapi.config.get<string>('admin.path').replace(/\/[^/]+\/?$/, ''), // remove last part of the path
    type: 'admin',
  };

  return createAPI(strapi, opts);
};

export { createAdminAPI };
