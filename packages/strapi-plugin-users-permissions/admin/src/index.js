import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import layout from '../../config/layout';
import pluginId from './pluginId';
import App from './containers/App';
import Initializer from './containers/Initializer';
import lifecycles from './lifecycles';
import trads from './translations';

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
    injectedComponents: [],
    isRequired: pluginPkg.strapi.required || false,
    layout,
    lifecycles,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: App,
    name: pluginPkg.strapi.name,
    pluginLogo,
    preventComponentRendering: false,
    settings: {},
    suffixUrl: () => '/roles',
    suffixUrlToReplaceForLeftMenuHighlight: '/roles',
    trads,
  };

  return strapi.registerPlugin(plugin);
};
