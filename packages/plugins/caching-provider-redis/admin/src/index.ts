import pluginPkg from '../../package.json';

import { pluginId } from './pluginId';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import type { StrapiApp } from '@strapi/admin/strapi-admin';

const name = pluginPkg.strapi.name;

// eslint-disable-next-line import/no-default-export
export default {
  register(app: StrapiApp) {
    app.registerPlugin({
      id: pluginId,
      name,
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
