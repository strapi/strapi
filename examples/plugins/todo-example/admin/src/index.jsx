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

  async registerTrads({ locales, importLocaleJson }) {
    const importedTrads = await Promise.all(
      locales.map(async (locale) => {
        const data = await importLocaleJson(
          locale,
          (code) => import(`./translations/${code}.json`)
        );

        return {
          data: prefixPluginTranslations(data, name),
          locale,
        };
      })
    );
    return importedTrads;
  },
};
