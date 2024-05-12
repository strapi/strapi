import type { Strapi } from '@strapi/types';

export default (strapi: Strapi) => {
  strapi.container.get('sanitizers').set('content-api', { input: [], output: [], query: [] });
};
