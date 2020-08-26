// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import pluginLogo from './assets/images/logo.svg';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    icon: pluginPkg.strapi.icon,
    id: pluginId,
    isReady: true,
    initializer: () => null,
    injectedComponents: [],
    isRequired: pluginPkg.strapi.required || false,
    layout: null,
    lifecycles: () => {},
    mainComponent: null,
    name: pluginPkg.strapi.name,
    pluginLogo,
    preventComponentRendering: false,
    trads: {},
  };

  return strapi.registerPlugin(plugin);
};
