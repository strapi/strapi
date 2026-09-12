import { addDefaultHeaders } from '@strapi/admin/strapi-admin';

import { SpaceSwitcher } from './components/SpaceSwitcher';
import { FEATURE_ID, PERMISSIONS } from './constants';
import { addSpaceColumnHook } from './contentManagerHooks/listView';
import { pluginId } from './pluginId';
import { getSpaceHeaders } from './selectedSpace';
import { spacesApi } from './services/api';
import { getTranslation } from './utils/getTranslation';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import type { StrapiApp } from '@strapi/admin/strapi-admin';

/**
 * Whether this project has Spaces.
 *
 * Community projects, and Enterprise ones whose licence does not carry the
 * feature, get none of these screens — the routes behind them are not
 * registered either, so a settings link would only lead somewhere broken.
 */
const isEnabled = () => {
  // Read defensively rather than through the ambient type: `features` carries
  // licence feature names, which are open-ended, and the declared shape only
  // names the ones the admin itself knows about.
  const features = (window as { strapi?: { features?: { isEnabled?: (name: string) => boolean } } })
    .strapi?.features;

  return Boolean(features?.isEnabled?.(FEATURE_ID));
};

// eslint-disable-next-line import/no-default-export
export default {
  register(app: StrapiApp) {
    if (!isEnabled()) {
      return;
    }

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
    if (!isEnabled()) {
      return;
    }

    app.injectAdminComponent('navigation', 'top', {
      name: 'spaces-switcher',
      Component: SpaceSwitcher,
    });

    app.registerHook('Admin/CM/pages/ListView/inject-column-in-table', addSpaceColumnHook);

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
