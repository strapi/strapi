import pluginPkg from '../../package.json';
import App from './containers/App';
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
    initializer: null,
    injectedComponents: [],
    isReady: true,
    layout: null,
    lifecycles: null,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: App,
    name: pluginPkg.strapi.name,
    preventComponentRendering: false,
    trads,
  };

  return strapi.registerPlugin(plugin);
};
