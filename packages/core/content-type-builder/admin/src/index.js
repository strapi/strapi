// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import App from './containers/App';
import Link from './InjectedComponents/ContentManager/EditViewLink';
import Button from './InjectedComponents/ContentManager/EditSettingViewButton';
import trads from './translations';
import pluginPermissions from './permissions';
import pluginId from './pluginId';
import reducers from './reducers';
import formsAPI from './utils/formAPI';

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
        listView: { links: [] },
      },
      isRequired: pluginPkg.strapi.required || false,
      isReady: true,
      mainComponent: App,
      name,
      pluginLogo,
      trads,
      menu: {
        pluginsSectionLinks: [
          {
            destination: `/plugins/${pluginId}`,
            icon,
            label: {
              id: `${pluginId}.plugin.name`,
              defaultMessage: 'Content-Types Builder',
            },
            name,
            permissions: pluginPermissions.main,
          },
        ],
      },
      // Internal APIs exposed by the CTB for the other plugins to use
      apis: {
        forms: formsAPI,
      },
    });
  },
  boot(app) {
    const cmPlugin = app.getPlugin('content-manager');

    cmPlugin.injectComponent('editView', 'right-links', {
      name: 'content-type-builder.link',
      Component: Link,
    });

    cmPlugin.injectComponent('editSettingsView', 'links', {
      name: 'content-type-builder.left-link',
      Component: Button,
    });
  },
};
