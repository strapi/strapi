import pluginPkg from '../../package.json';
import pluginId from './pluginId';

const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
const icon = pluginPkg.strapi.icon;
const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.registerPlugin({
      description: pluginDescription,
      icon,
      id: pluginId,
      isReady: true,
      isRequired: pluginPkg.strapi.required || false,
      mainComponent: () => 'My plugin',
      name,
      settings: null,
      trads: {},
      menu: {
        pluginsSectionLinks: [
          {
            destination: `/plugins/${pluginId}`,
            icon,
            label: {
              id: `${pluginId}.plugin.name`,
              defaultMessage: 'My plugin',
            },
            name,
            permissions: null,
          },
        ],
      },
    });
  },
  boot() {},
};
