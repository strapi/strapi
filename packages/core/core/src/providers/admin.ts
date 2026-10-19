import type { Core } from '@strapi/types';

import { defineProvider } from './provider';
import loadAdmin from '../loaders/admin';

// The provider is shared by every instance in the process. Track the instances that loaded the
// admin services, so destroy runs only for an instance that loaded the admin services (not e.g.
// for the config-only instance of `strapi build`, or on a SIGINT during `strapi.load()`)
const registeredInstances = new WeakSet<Core.Strapi>();

export default defineProvider({
  init(strapi) {
    // eslint-disable-next-line node/no-missing-require
    strapi.add('admin', () => require('@strapi/admin/strapi-server'));
  },

  async register(strapi) {
    await loadAdmin(strapi);
    registeredInstances.add(strapi);

    await strapi.get('admin')?.register({ strapi });
  },

  async bootstrap(strapi) {
    await strapi.get('admin')?.bootstrap({ strapi });
  },

  async destroy(strapi) {
    if (registeredInstances.has(strapi) === false) {
      return;
    }

    await strapi.get('admin')?.destroy({ strapi });
  },
});
