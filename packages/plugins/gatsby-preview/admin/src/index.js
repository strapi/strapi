import { prefixPluginTranslations } from '@strapi/helper-plugin';
import pluginPkg from '../../package.json';
import OpenPreviewButton from './components/OpenPreviewButton';
import pluginId from './pluginId';
import getTrad from './utils/getTrad';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.createSettingSection(
      {
        id: pluginId,
        intlLabel: {
          id: getTrad('Settings.section-label'),
          defaultMessage: 'Gatsby preview plugin',
        },
      },
      [
        {
          intlLabel: {
            id: getTrad('Settings.link-name'),
            defaultMessage: 'Configuration',
          },
          id: 'settings',
          to: `/settings/${pluginId}`,
          Component: async () => {
            const component = await import(
              /* webpackChunkName: "gatsby-preview-settings-page" */ './pages/SettingsPage'
            );

            return component;
          },
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: pluginId,
      name,
    });
  },
  bootstrap(app) {
    app.injectContentManagerComponent('editView', 'right-links', {
      name: 'gatsby-preview-button',
      Component: OpenPreviewButton,
    });
  },
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map(locale => {
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
