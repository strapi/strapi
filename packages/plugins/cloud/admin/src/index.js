import { prefixPluginTranslations } from '@strapi/helper-plugin';

import pluginPkg from '../../package.json';

import Initializer from './components/Initializer';
import PluginIcon from './components/PluginIcon';
import pluginId from './pluginId';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    const { backendURL } = window.strapi;

    // Only add the plugin menu link and registering it if the project is on development (localhost).
    if (backendURL?.includes('localhost')) {
      app.addMenuLink({
        to: `/plugins/${pluginId}`,
        icon: PluginIcon,
        intlLabel: {
          id: `${pluginId}.plugin.name`,
          defaultMessage: name,
        },
        async Component() {
          const component = await import(
            /* webpackChunkName: "strapi-cloud-plugin" */ './pages/App'
          );

          return component;
        },
      });

      app.registerPlugin({
        id: pluginId,
        initializer: Initializer,
        isReady: false,
        name,
      });
    }
  },

  bootstrap() {},
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(
          /* webpackChunkName: "translation-[request]" */ `./translations/${locale}.json`
        )
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
