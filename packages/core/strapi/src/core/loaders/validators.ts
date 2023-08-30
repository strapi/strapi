import type { Strapi } from '../../Strapi';

export default (strapi: Strapi) => {
  strapi.container.get('validators').set('content-api', { input: [], query: [] });
};
