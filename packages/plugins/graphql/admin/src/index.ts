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
