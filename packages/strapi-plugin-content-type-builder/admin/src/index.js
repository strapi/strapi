import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import App from './containers/App';
import Initializer from './containers/Initializer';
import Link from './InjectedComponents/ContentManager/EditViewLink';
import Button from './InjectedComponents/ContentManager/EditSettingViewButton';
import lifecycles from './lifecycles';
import trads from './translations';
import pluginId from './pluginId';

export default strapi => {
  const pluginDescription =
    pluginPkg.strapi.description || pluginPkg.description;
  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    icon: pluginPkg.strapi.icon,
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
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: App,
    name: pluginPkg.strapi.name,
    pluginLogo,
    preventComponentRendering: false,
    trads,
  };

  return strapi.registerPlugin(plugin);
};
