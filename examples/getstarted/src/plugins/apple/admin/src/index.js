import { prefixPluginTranslations } from '@strapi/helper-plugin';
import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import Initializer from './components/Initializer';

const name = pluginPkg.strapi.name;

const replaceFields = (list, fields) =>
  list.map((items) => items.map((field) => ({ ...field, ...fields[field.name] })));

const insertFields = (list, index, ...items) => [
  ...list.slice(0, index),
  ...items,
  ...list.slice(index),
];

export default {
  register(app) {
    const plugin = {
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    };

    app.registerPlugin(plugin);

    app.appPlugins['users-permissions'].transformFields('apple', (layout) => {
      const BEFORE_CALLBACK = layout.form.findIndex((items) =>
        items.find(({ name }) => name === 'callback')
      );

      return {
        ...layout,
        form: insertFields(
          replaceFields(layout.form, {
            secret: {
              type: 'textarea',
            },
          }),
          BEFORE_CALLBACK,
          [
            {
              intlLabel: {
                id: 'todo.teamId',
                defaultMessage: 'Team ID',
              },
              name: 'teamId',
              type: 'text',
              placeholder: {
                id: 'todo.placeholder',
                defaultMessage: 'TEXT',
              },
              size: 12,
              validations: {
                required: true,
              },
            },
          ],
          [
            {
              intlLabel: {
                id: 'todo.keyIdentifier',
                defaultMessage: 'Key ID',
              },
              name: 'keyIdentifier',
              type: 'text',
              placeholder: {
                id: 'todo.placeholder',
                defaultMessage: 'TEXT',
              },
              size: 12,
              validations: {
                required: true,
              },
            },
          ]
        ),
      };
    });
    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },

  bootstrap(app) {},
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
