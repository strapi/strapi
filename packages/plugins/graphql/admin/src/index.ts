import { importLocaleJsonWithLegacyDkFallback } from '@strapi/admin/strapi-admin';
import pluginPkg from '../../package.json';

import { pluginId } from './pluginId';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

const name = pluginPkg.strapi.name;

// eslint-disable-next-line import/no-default-export
export default {
  // TODO: we need to have the type for StrapiApp done from `@strapi/admin` package.
  register(app: any) {
    app.registerPlugin({
      id: pluginId,
      name,
    });
  },
  bootstrap() {},
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map(async (locale) => {
        const data = await importLocaleJsonWithLegacyDkFallback(locale, (code) =>
          import(`./translations/${code}.json`)
        );

        return {
          data: prefixPluginTranslations(data, pluginId),
          locale,
        };
      })
    );

    return importedTrads;
  },
};
