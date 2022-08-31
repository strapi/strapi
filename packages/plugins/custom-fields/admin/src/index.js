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
      options: {
        advanced: [
          {
            intlLabel: {
              id: getTrad('color-picker.options.advanced.regex'),
              defaultMessage: 'RegExp pattern',
            },
            name: 'regex',
            type: 'text',
            description: {
              id: getTrad('color-picker.options.advanced.regex.description'),
              defaultMessage: 'The text of the regular expression',
            },
          },
          {
            sectionTitle: {
              id: 'global.settings',
              defaultMessage: 'Settings',
            },
            items: [
              {
                name: 'required',
                type: 'checkbox',
                intlLabel: {
                  id: getTrad('color-picker.options.advanced.requiredField'),
                  defaultMessage: 'Required field',
                },
                description: {
                  id: getTrad('color-picker.options.advanced.requiredField.description'),
                  defaultMessage: "You won't be able to create an entry if this field is empty",
                },
              },
            ],
          },
        ],
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
