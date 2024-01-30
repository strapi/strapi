import { prefixPluginTranslations } from '@strapi/helper-plugin';
import { Information } from '@strapi/icons';

import pluginPkg from '../../package.json';

import { PERMISSIONS } from './constants';
import pluginId from './pluginId';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: Information,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Documentation',
      },
      permissions: PERMISSIONS.main,
      Component: () => import('./pages/PluginPage'),
    });

    app.registerPlugin({
      id: pluginId,
      name,
    });
  },
  bootstrap(app) {
    app.addSettingsLink('global', {
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Documentation',
      },
      id: 'documentation',
      to: pluginId,
      Component: () => import('./pages/SettingsPage'),
      permissions: PERMISSIONS.main,
    });
  },
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  },
};
