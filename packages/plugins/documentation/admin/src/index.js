// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import pluginPkg from '../../package.json';
import pluginPermissions from './permissions';
import pluginId from './pluginId';
import pluginLogo from './assets/images/logo.svg';
import App from './containers/App';
import trads from './translations';

// export default strapi => {
//   const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
//   const icon = pluginPkg.strapi.icon;
//   const name = pluginPkg.strapi.name;
// const plugin = {
//   blockerComponent: null,
//   blockerComponentProps: {},
//   description: pluginDescription,
//   icon,
//   id: pluginId,
//   injectedComponents: [],
//   isReady: true,
//   isRequired: pluginPkg.strapi.required || false,
//   mainComponent: App,
//   name,
//   pluginLogo,
//   preventComponentRendering: false,
//   trads,
//   menu: {
//     pluginsSectionLinks: [
//       {
//         destination: `/plugins/${pluginId}`,
//         icon,
//         label: {
//           id: `${pluginId}.plugin.name`,
//           defaultMessage: 'Documentation',
//         },
//         name,
//         permissions: pluginPermissions.main,
//       },
//     ],
//   },
// };

//   return strapi.registerPlugin(plugin);
// };

const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
const icon = pluginPkg.strapi.icon;
const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.registerPlugin({
      description: pluginDescription,
      icon,
      id: pluginId,
      // TODO
      isReady: true,
      // TODO
      isRequired: pluginPkg.strapi.required || false,
      // TODO
      mainComponent: App,
      name,
      pluginLogo,
      // TODO
      trads,
      // TODO
      menu: {
        pluginsSectionLinks: [
          {
            destination: `/plugins/${pluginId}`,
            icon,
            label: {
              id: `${pluginId}.plugin.name`,
              defaultMessage: 'Documentation',
            },
            name,
            permissions: pluginPermissions.main,
          },
        ],
      },
    });
  },
  boot() {},
};
