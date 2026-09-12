import { addDefaultHeaders } from '@strapi/admin/strapi-admin';

import { SpaceSwitcher } from './components/SpaceSwitcher';
import { PERMISSIONS } from './constants';
import { pluginId } from './pluginId';
import { getSpaceHeaders } from './selectedSpace';
import { spacesApi } from './services/api';
import { getTranslation } from './utils/getTranslation';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import type { StrapiApp } from '@strapi/admin/strapi-admin';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: StrapiApp) {
    app.addMiddlewares([() => spacesApi.middleware]);
    app.addReducers({ [spacesApi.reducerPath]: spacesApi.reducer });

    /**
     * Every admin request says which space it is for.
     *
     * Registering it here rather than in a component means it is in place
     * before the first request goes out — including the ones the application
     * makes while it is still starting up.
     */
    addDefaultHeaders(getSpaceHeaders);

    app.registerPlugin({ id: pluginId, name: pluginId });
  },

  bootstrap(app: StrapiApp) {
    app.injectAdminComponent('navigation', 'top', {
      name: 'spaces-switcher',
      Component: SpaceSwitcher,
    });

    app.addSettingsLink('global', {
      id: 'spaces',
      to: 'spaces',
      intlLabel: { id: getTranslation('plugin.name'), defaultMessage: 'Spaces' },
      permissions: PERMISSIONS.read,
      Component: () =>
        import('./pages/SettingsPage').then((mod) => ({ default: mod.ProtectedSettingsPage })),
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);

          return { data: prefixPluginTranslations(data, pluginId), locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
