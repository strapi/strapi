import { prefixPluginTranslations } from '@strapi/helper-plugin';
import PluginIcon from './components/PluginIcon';
import pluginPkg from '../../package.json';
import pluginId from './pluginId';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'My plugin',
      },
      Component: async () => {
        const component = await import(/* webpackChunkName: "my-plugin" */ './pages/App');

        return component;
      },
      permissions: [],
    });

    app.registerPlugin({
      id: pluginId,
      name,
    });

    const allTypes = [
      'biginteger',
      'boolean',
      'date',
      'datetime',
      'decimal',
      'email',
      'enumeration',
      'float',
      'integer',
      'json',
      'password',
      'richtext',
      'string',
      'text',
      'time',
      'uid',
    ];

    allTypes.forEach((type) => {
      const upcasedType = type.charAt(0).toUpperCase() + type.slice(1);
      const customField = {
        type,
        pluginId: 'myplugin',
        name: `custom${upcasedType}`,
        intlLabel: {
          id: 'customfieldtest',
          defaultMessage: `custom${upcasedType}`,
        },
        intlDescription: {
          id: 'customfieldtest',
          defaultMessage: `custom${upcasedType}`,
        },
        components: {
          Input: async () =>
            import(/* webpackChunkName: "test-custom-field" */ './components/PluginIcon'),
        },
      };

      app.customFields.register(customField);
    });
  },
  bootstrap() {},
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(
          /* webpackChunkName: "[pluginId]-[request]" */ `./translations/${locale}.json`
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
