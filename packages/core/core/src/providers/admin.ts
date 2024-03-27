import type { Core } from '@strapi/types';

import loadAdmin from '../loaders/admin';

export default {
  init(strapi: Core.Strapi) {
    strapi.add('admin', () => require('@strapi/admin/strapi-server'));
  },

  async register(strapi: Core.Strapi) {
    await loadAdmin(strapi);

    await strapi.get('admin')?.register({ strapi });
  },

  async bootstrap(strapi: Core.Strapi) {
    await strapi.get('admin')?.bootstrap({ strapi });
  },

  async destroy(strapi: Core.Strapi) {
    await strapi.get('admin')?.destroy({ strapi });
  },
};
