import { prefixPluginTranslations } from '@strapi/helper-plugin';
import { PaperPlane } from '@strapi/icons';

import { pluginId } from './pluginId';

import type { Plugin } from '@strapi/types';

// eslint-disable-next-line import/no-default-export
const admin: Plugin.Config.AdminInput = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(app: any) {
    if (window.strapi.features.isEnabled('cms-content-releases')) {
      app.addMenuLink({
        to: `/plugins/${pluginId}`,
        icon: PaperPlane,
        intlLabel: {
          id: `${pluginId}.plugin.name`,
          defaultMessage: 'Content Releases',
        },
        async Component() {
          const { Releases } = await import('./pages/App');
          return Releases;
        },
        permissions: [],
      });
    }
  },
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(
          /* webpackChunkName: "content-releases-translation-[request]" */ `./translations/${locale}.json`
        )
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, 'content-releases'),
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

// eslint-disable-next-line import/no-default-export
export default admin;
