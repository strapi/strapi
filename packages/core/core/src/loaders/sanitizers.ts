import type { Core } from '@strapi/types';

export default (strapi: Core.Strapi) => {
  strapi.get('sanitizers').set('content-api', { input: [], output: [], query: [] });
};
