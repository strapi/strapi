import { defineProvider } from './provider';
import loadAdmin from '../loaders/admin';

export default defineProvider({
  init(strapi) {
    // eslint-disable-next-line node/no-missing-require
    strapi.add('admin', () => require('@strapi/admin/strapi-server'));
  },

  async register(strapi) {
    await loadAdmin(strapi);

    await strapi.get('admin')?.register({ strapi });
  },

  async bootstrap(strapi) {
    await strapi.get('admin')?.bootstrap({ strapi });
  },

  async destroy(strapi) {
    await strapi.get('admin')?.destroy({ strapi });
  },
});
