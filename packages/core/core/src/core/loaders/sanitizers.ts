import type { Strapi } from '@strapi/types';

export default (strapi: Strapi) => {
  strapi.get('sanitizers').set('content-api', { input: [], output: [], query: [] });
};
