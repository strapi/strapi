/* eslint-disable check-file/filename-naming-convention */

import { Cloud } from '@strapi/icons';

import { Initializer } from './components/Initializer';
import { pluginId } from './pluginId';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

const name = 'Deploy';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: any) {
    const { backendURL } = window.strapi;

    // Only add the plugin menu link and registering it if the project is on development (localhost).
    if (backendURL?.includes('localhost')) {
      app.addMenuLink({
        to: `plugins/${pluginId}`,
        icon: Cloud,
        intlLabel: {
          id: `${pluginId}.plugin.name`,
          defaultMessage: name,
        },
        Component: async () => {
          const { App } = await import('./pages/App');

          return App;
        },
      });
      const plugin = {
        id: pluginId,
        initializer: Initializer,
        isReady: false,
        name,
      };

      app.registerPlugin(plugin);
    }
  },

  async registerTrads(app: any) {
    const { locales } = app;

    const importedTrads = await Promise.all(
      (locales as any[]).map((locale) => {
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
