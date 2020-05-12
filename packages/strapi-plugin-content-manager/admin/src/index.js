import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import pluginLogo from './assets/images/logo.svg';
import App from './containers/Main';
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
    isReady: false,
    isRequired: pluginPkg.strapi.required || false,
    layout: null,
    lifecycles,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: App,
    name: pluginPkg.strapi.name,
    pluginLogo,
    preventComponentRendering: false,
    suffixUrl: () => '/ctm-configurations/models',
    suffixUrlToReplaceForLeftMenuHighlight: '/models',
    trads,
  };

  return strapi.registerPlugin(plugin);
};
