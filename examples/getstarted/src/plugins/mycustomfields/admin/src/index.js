import { prefixPluginTranslations } from '@strapi/helper-plugin';
import pluginId from './pluginId';
import ColorPickerIcon from './components/ColorPicker/ColorPickerIcon';

export default {
  register(app) {
    app.customFields.register([
      {
        name: 'color',
        pluginId: 'mycustomfields',
        type: 'text',
        icon: ColorPickerIcon,
        intlLabel: {
          id: 'mycustomfields.color.label',
          defaultMessage: 'Color',
        },
        intlDescription: {
          id: 'mycustomfields.color.description',
          defaultMessage: 'Select any color',
        },
        components: {
          Input: async () =>
            import(
              /* webpackChunkName: "input-component" */ './components/ColorPicker/ColorPickerInput'
            ),
        },
      },
      {
        name: 'aMap',
        pluginId: 'mycustomfields',
        type: 'json',
        intlLabel: {
          id: 'mycustomfields.map.label',
          defaultMessage: 'aMap',
        },
        intlDescription: {
          id: 'mycustomfields.map.description',
          defaultMessage: 'Select any location',
        },
        components: {
          Input: async () =>
            import(
              /* webpackChunkName: "input-component" */ './components/ColorPicker/ColorPickerInput'
            ),
        },
      },
    ]);
  },
  bootstrap(app) {},
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
