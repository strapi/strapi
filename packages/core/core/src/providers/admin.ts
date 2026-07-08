import { importModule } from '@strapi/utils';
import { defineProvider } from './provider';
import loadAdmin from '../loaders/admin';

let adminServerModule: Awaited<
  ReturnType<typeof importModule<typeof import('@strapi/admin/strapi-server')>>
> | null = null;

export default defineProvider({
  init(strapi) {
    strapi.add('admin', () => {
      if (!adminServerModule) {
        throw new Error('Admin server module is not loaded');
      }

      return adminServerModule;
    });
  },

  async register(strapi) {
    adminServerModule = await importModule<typeof import('@strapi/admin/strapi-server')>(
      '@strapi/admin/strapi-server'
    );

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
