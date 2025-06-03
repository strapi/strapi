import { Layout } from '@strapi/icons';

import { PERMISSIONS } from './constants';
import { pluginId } from './pluginId';
import { reducers } from './reducers';
import { formsAPI } from './utils/formAPI';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import type { StrapiApp } from '@strapi/admin/strapi-admin';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: StrapiApp) {
    app.addReducers(reducers);
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: Layout,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Content-Type Builder',
      },
      permissions: PERMISSIONS.main,
      Component: () => import('./pages/App'),
      position: 5,
    });

    app.registerPlugin({
      id: pluginId,
      name: pluginId,
      // Internal APIs exposed by the CTB for the other plugins to use
      apis: {
        forms: formsAPI,
      },
    });
  },
  bootstrap() {},
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

export * from './exports';
