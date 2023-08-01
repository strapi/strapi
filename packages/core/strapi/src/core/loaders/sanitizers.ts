import type { Strapi } from '../../Strapi';

export default (strapi: Strapi) => {
  strapi.container.get('sanitizers').set('content-api', { input: [], output: [] });
};
