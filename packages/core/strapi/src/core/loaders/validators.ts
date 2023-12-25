import type { Strapi } from '@strapi/types';

export default (strapi: Strapi) => {
  strapi.container.get('validators').set('content-api', { input: [], query: [] });
};
