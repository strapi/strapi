import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import App from './containers/App';
import Initializer from './containers/Initializer';
import trads from './translations';

const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
const icon = pluginPkg.strapi.icon;
const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.registerPlugin({
      description: pluginDescription,
      icon,
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      isRequired: pluginPkg.strapi.required || false,
      mainComponent: App,
      name,
      menu: {
        pluginsSectionLinks: [
          {
            destination: `/plugins/${pluginId}`,
            icon,
            label: {
              id: `${pluginId}.plugin.name`,
              defaultMessage: name,
            },
            name,
            permissions: [
              // Uncomment to set the permissions of the plugin here
              // {
              //   action: '', // the action name should be plugins::plugin-name.actionType
              //   subject: null,
              // },
            ],
          },
        ],
      },
      trads,
    });
  },
  boot(app) {},
};
