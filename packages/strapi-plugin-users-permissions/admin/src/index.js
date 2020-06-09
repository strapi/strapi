// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import layout from '../../config/layout';
import pluginId from './pluginId';
import App from './containers/App';
import Initializer from './containers/Initializer';
import lifecycles from './lifecycles';
import reducers from './reducers';
import trads from './translations';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
  const icon = pluginPkg.strapi.icon;
  const name = pluginPkg.strapi.name;

  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    icon,
    id: pluginId,
    initializer: Initializer,
    injectedComponents: [],
    isRequired: pluginPkg.strapi.required || false,
    layout,
    lifecycles,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: App,
    name,
    pluginLogo,
    preventComponentRendering: false,
    reducers,
    settings: {},
    trads,
    menu: {
      pluginsSectionLinks: [
        {
          destination: `/plugins/${pluginId}`,
          icon,
          label: {
            id: `${pluginId}.plugin.name`,
            defaultMessage: 'Roles & Permissions',
          },
          name,
          permissions: [
            { action: 'plugins::users-permissions.advanced-settings.read', subject: null },
            { action: 'plugins::users-permissions.advanced-settings.update', subject: null },
            { action: 'plugins::users-permissions.email-templates.read', subject: null },
            { action: 'plugins::users-permissions.email-templates.update', subject: null },
            { action: 'plugins::users-permissions.providers.read', subject: null },
            { action: 'plugins::users-permissions.providers.update', subject: null },
            { action: 'plugins::users-permissions.roles.create', subject: null },
            { action: 'plugins::users-permissions.roles.read', subject: null },
          ],
        },
      ],
    },
  };

  return strapi.registerPlugin(plugin);
};
