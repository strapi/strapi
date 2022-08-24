import { prefixPluginTranslations } from '@strapi/helper-plugin';
import pluginId from './pluginId';
import ColorPickerIcon from './components/ColorPicker/ColorPickerIcon';
import getTrad from './utils/getTrad';

export default {
  register(app) {
    app.customFields.register({
      name: 'color-picker',
      pluginId: 'custom-fields',
      type: 'string',
      icon: ColorPickerIcon,
      intlLabel: {
        id: getTrad('color-picker.label'),
        defaultMessage: 'Color Picker',
      },
      intlDescription: {
        id: getTrad('color-picker.description'),
        defaultMessage: 'Select any color',
      },
      components: {
        Input: async () =>
          import(
            /* webpackChunkName: "color-picker-input-component" */ './components/ColorPicker/ColorPickerInput'
          ),
      },
    });
  },
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
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
