import { Write } from '@strapi/icons';

import { ContentManagerPlugin } from './content-manager';
import { reducer } from './modules/reducers';
import { prefixPluginTranslations } from './utils/translations';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: any) {
    const cm = new ContentManagerPlugin();

    app.addReducers(reducer);

    app.addMenuLink({
      to: `content-manager`,
      icon: Write,
      intlLabel: {
        id: `content-manager.plugin.name`,
        defaultMessage: 'Content Manager',
      },
      Component: () => import('./layout'),
    });

    app.registerPlugin(cm.config);
  },
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, 'content-manager'),
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
