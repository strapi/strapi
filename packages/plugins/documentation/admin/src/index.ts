import { Information } from '@strapi/icons';

import { PERMISSIONS } from './constants';
import { pluginId } from './pluginId';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: Information,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Documentation',
      },
      permissions: PERMISSIONS.main,
      Component: async () => {
        const { App } = await import('./pages/App');
        return App;
      },
      position: 9,
    });

    app.registerPlugin({
      id: pluginId,
      name: pluginId,
    });
  },
  bootstrap(app: any) {
    app.addSettingsLink('global', {
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Documentation',
      },
      id: 'documentation',
      to: pluginId,
      Component: async () => {
        const { SettingsPage } = await import('./pages/Settings');
        return SettingsPage;
      },
      permissions: PERMISSIONS.main,
    });
  },
  async registerTrads({ locales }: { locales: string[] }) {
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
