import type { Core } from '@strapi/types';

export default (strapi: Core.Strapi) => {
  strapi.get('validators').set('content-api', { input: [], query: [] });
};
