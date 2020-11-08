// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import App from './containers/App';
import Initializer from './containers/Initializer';
import Link from './InjectedComponents/ContentManager/EditViewLink';
import Button from './InjectedComponents/ContentManager/EditSettingViewButton';
import lifecycles from './lifecycles';
import trads from './translations';
import pluginPermissions from './permissions';
import pluginId from './pluginId';

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
    injectedComponents: [
      {
        plugin: 'content-manager.editView',
        area: 'right.links',
        component: Link,
        key: 'content-type-builder.link',
        props: {
          message: {
            id: 'content-manager.containers.Edit.Link.Fields',
          },
          icon: 'fa-cog',
        },
      },
      {
        plugin: 'content-manager.editSettingsView',
        area: 'left.links',
        component: Button,
        key: 'content-type-builder.form',
      },
    ],
    isRequired: pluginPkg.strapi.required || false,
    layout: null,
    lifecycles,
    mainComponent: App,
    name,
    pluginLogo,
    preventComponentRendering: false,
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
  };

  return strapi.registerPlugin(plugin);
};
