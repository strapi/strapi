import type { Strapi } from '@strapi/typings';

export default (strapi: Strapi) => {
  strapi.container.get('validators').set('content-api', { input: [], query: [] });
};
