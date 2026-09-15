import { prefixPluginTranslations } from './utils/prefixPluginTranslations';
import pluginId from './pluginId';
import { GoogleTranslateHeaderAction } from './components/TranslateActions';

export default {
  register(app) {
    app.createSettingSection(
      {
        id: pluginId,
        intlLabel: {
          id: `${pluginId}.plugin.name`,
          defaultMessage: 'Google Translate',
        },
      },
      [
        {
          intlLabel: {
            id: `${pluginId}.settings.title`,
            defaultMessage: 'Credentials',
          },
          id: 'credentials',
          to: `${pluginId}/credentials`,
          Component: () => import('./pages/SettingsPage'),
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: pluginId,
      name: pluginId,
    });
  },

  bootstrap(app) {
    const contentManager = app.getPlugin('content-manager');
    const apis = contentManager?.apis;

    if (apis?.addDocumentHeaderAction) {
      apis.addDocumentHeaderAction((actions) => [...actions, GoogleTranslateHeaderAction]);
    }
  },

  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => ({
            data: prefixPluginTranslations(data, pluginId),
            locale,
          }))
          .catch(() => ({ data: {}, locale }));
      })
    );

    return Promise.resolve(importedTrads);
  },
};
