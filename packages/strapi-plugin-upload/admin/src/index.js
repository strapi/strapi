import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import App from './containers/App';
import trads from './translations';
import pluginId from './pluginId';
import getTrad from './utils/getTrad';

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
    pluginLogo,
    preventComponentRendering: false,
    settings: {
      global: [
        {
          title: {
            id: getTrad('settings.link.label'),
            defaultMessage: 'Media Library',
          },
          name: 'media-library',
          to: `${strapi.settingsBaseURL}/media-library`,
          // TODO
          Component: () => 'COMING SOON',
        },
      ],
    },
    trads,
  };

  return strapi.registerPlugin(plugin);
};
