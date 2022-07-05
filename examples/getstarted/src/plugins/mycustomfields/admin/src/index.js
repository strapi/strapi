import { prefixPluginTranslations } from '@strapi/helper-plugin';
import pluginId from './pluginId';
// TODO: Uncomment for EXPANSION-235
//import ColorPickerIcon from './components/ColorPicker/ColorPickerIcon';

export default {
  register(app) {
    // TODO: Uncomment for EXPANSION-235
    // app.customFields.register({
    //   name: 'color',
    //   pluginId: 'color-picker',
    //   type: 'text',
    //   icon: ColorPickerIcon,
    //   intlLabel: {
    //     id: 'color-picker.color.label',
    //     defaultMessage: 'Color',
    //   },
    //   intlDescription: {
    //     id: 'color-picker.color.description',
    //     defaultMessage: 'Select any color',
    //   },
    //   components: {
    //     Input: async () => import(/* webpackChunkName: "input-component" */ './components/ColorPicker/ColorPickerInput'),
    //   },
    // });
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
