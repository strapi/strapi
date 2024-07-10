/* eslint-disable check-file/filename-naming-convention */

import { Cloud } from '@strapi/icons';

import { pluginId } from './pluginId';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

const name = 'Deploy';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: Cloud,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: name,
      },
      Component: () => import('./pages/App').then((mod) => ({ default: mod.App })),
    });

    app.registerPlugin({ id: pluginId, name });
  },

  async registerTrads(app: any) {
    const { locales } = app;

    const importedTrads = await Promise.all(
      (locales as string[]).map((locale) => {
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
