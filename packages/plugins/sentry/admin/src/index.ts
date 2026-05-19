import pluginPkg from '../../package.json';

import { pluginId } from './pluginId';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import { type StrapiApp } from '@strapi/admin/strapi-admin';

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
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);

          return {
            data: prefixPluginTranslations(data ?? {}, pluginId),
            locale,
          };
        } catch {
          return {
            data: {},
            locale,
          };
        }
      })
    );

    return importedTrads;
  },
};
