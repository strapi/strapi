import { prefixPluginTranslations } from './utils/prefixPluginTranslations';
import pluginId from './pluginId';
import { HtmlEditorIcon } from './components/HtmlEditorIcon';
import getTrad from './utils/getTrad';

export default {
  register(app) {
    app.customFields.register({
      name: 'html',
      pluginId,
      type: 'richtext',
      icon: HtmlEditorIcon,
      intlLabel: {
        id: getTrad('html-editor.label'),
        defaultMessage: 'HTML editor',
      },
      intlDescription: {
        id: getTrad('html-editor.description'),
        defaultMessage: 'Rich text with colors, media, tables, and HTML source',
      },
      components: {
        Input: async () =>
          import('./components/HtmlEditorInput').then((module) => ({
            default: module.HtmlEditorInput,
          })),
      },
    });

    app.registerPlugin({
      id: pluginId,
      name: pluginId,
    });
  },

  bootstrap() {},

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
