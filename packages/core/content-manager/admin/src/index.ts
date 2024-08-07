import { Feather } from '@strapi/icons';

import { PLUGIN_ID } from './constants/plugin';
import { ContentManagerPlugin } from './content-manager';
import { historyAdmin } from './history';
import { reducer } from './modules/reducers';
import { routes } from './router';
import { prefixPluginTranslations } from './utils/translations';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: any) {
    const cm = new ContentManagerPlugin();

    app.addReducers({
      [PLUGIN_ID]: reducer,
    });

    app.addMenuLink({
      to: PLUGIN_ID,
      icon: Feather,
      intlLabel: {
        id: `content-manager.plugin.name`,
        defaultMessage: 'Content Manager',
      },
      permissions: [],
      position: 1,
    });

    app.router.addRoute({
      path: 'content-manager/*',
      lazy: async () => {
        const { Layout } = await import('./layout');

        return {
          Component: Layout,
        };
      },
      children: routes,
    });

    app.registerPlugin(cm.config);
  },
  bootstrap(app: any) {
    if (typeof historyAdmin.bootstrap === 'function') {
      historyAdmin.bootstrap(app);
    }
  },
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, PLUGIN_ID),
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

export * from './exports';
