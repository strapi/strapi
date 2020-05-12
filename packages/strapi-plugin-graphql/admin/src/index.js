import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import pluginLogo from './assets/images/logo.svg';

export default strapi => {
  const pluginDescription =
    pluginPkg.strapi.description || pluginPkg.description;

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
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: null,
    name: pluginPkg.strapi.name,
    pluginLogo,
    preventComponentRendering: false,
    trads: {},
  };

  return strapi.registerPlugin(plugin);
};
