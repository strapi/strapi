// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import pluginLogo from './assets/images/logo.svg';
import App from './containers/Main';
import ConfigureViewButton from './InjectedComponents/ContentTypeBuilder/ConfigureViewButton';
import reducers from './reducers';
import trads from './translations';

const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
const icon = pluginPkg.strapi.icon;
const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addReducers(reducers);

    app.registerPlugin({
      description: pluginDescription,
      icon,
      id: pluginId,
      injectionZones: {
        editSettingsView: { links: [] },
        editView: { informations: [], 'right-links': [] },
        listView: { actions: [], deleteModalAdditionalInfos: [] },
      },
      isReady: true,
      isRequired: pluginPkg.strapi.required || false,
      mainComponent: App,
      name,
      pluginLogo,
      preventComponentRendering: false,
      trads,
    });
  },
  boot(app) {
    const ctbPlugin = app.getPlugin('content-type-builder');

    ctbPlugin.injectComponent('listView', 'links', {
      name: 'content-type-builder.link',
      Component: ConfigureViewButton,
    });
  },
};
