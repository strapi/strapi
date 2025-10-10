import { prefixPluginTranslations } from './utils/prefixPluginTranslations';
import TodoCard from './components/TodoCard';

const name = 'todo-example';

/** @type import('@strapi/strapi/admin').PluginDefinition */
export default {
  register(app) {
    app.registerPlugin({
      id: 'todo-example',
      name,
    });
  },

  bootstrap(app) {
    app.getPlugin('content-manager').injectComponent('editView', 'right-links', {
      name: 'my-plugin-my-compo',
      Component: TodoCard,
    });
  },

  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, name),
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
