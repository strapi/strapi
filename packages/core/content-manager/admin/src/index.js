import Write from '@strapi/icons/Write';
import { prefixPluginTranslations } from '@strapi/helper-plugin';

import pluginPermissions from './permissions';
// import PluginIcon from './components/PluginIcon';
import pluginId from './pluginId';
import reducers from './reducers';

export default {
  register(app) {
    app.addReducers(reducers);

    app.addMenuLink({
      to: `/${pluginId}`,
      icon: Write,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Content Manager',
      },
      permissions: pluginPermissions.main,
      async Component() {
        const component = await import(/* webpackChunkName: "content-manager" */ './pages/App');

        return component;
      },
    });
  },
  bootstrap() {},
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(
          /* webpackChunkName: "content-manager-translation-[request]" */ `./translations/${locale}.json`
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
