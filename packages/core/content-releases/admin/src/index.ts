import { prefixPluginTranslations } from '@strapi/helper-plugin';

// eslint-disable-next-line import/no-default-export
export default {
  register() {
    if (window.strapi.features.isEnabled('cms-content-releases')) {
      // EE Code would be here
      // For testing if the plugin is working, add a console.log
    }
  },
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, 'releases'),
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
