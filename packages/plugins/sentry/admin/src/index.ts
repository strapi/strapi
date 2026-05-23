import pluginPkg from '../../package.json';

import { pluginId } from './pluginId';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import { type ImportLocaleJson, type StrapiApp } from '@strapi/admin/strapi-admin';

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
  async registerTrads({
    locales,
    importLocaleJson,
  }: {
    locales: string[];
    importLocaleJson: ImportLocaleJson;
  }) {
    const importedTrads = await Promise.all(
      locales.map(async (locale) => {
        const data = await importLocaleJson(
          locale,
          (code) => import(`./translations/${code}.json`)
        );

        return {
          data: prefixPluginTranslations(data ?? {}, pluginId),
          locale,
        };
      })
    );

    return importedTrads;
  },
};
