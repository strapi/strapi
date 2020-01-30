import pluginPkg from '../../package.json';
import layout from '../../config/layout';
import pluginId from './pluginId';
import App from './containers/App';
import Initializer from './containers/Initializer';
import lifecycles from './lifecycles';
import trads from './translations';

export default strapi => {
  const pluginDescription =
    pluginPkg.strapi.description || pluginPkg.description;
  const settings = {};
  // const settings = {
  //   menuSection: {
  //     id: pluginId,
  //     title: {
  //       id: 'Permissions',
  //     },
  //     links: [
  //       {
  //         title: 'coucou2',
  //         to: '/settings/webhooks',
  //         name: 'coucou2',
  //         links: [
  //           {
  //             title: {
  //               id: 'coucou',
  //             },
  //             to: '/settings/webhooks',
  //             name: 'webhooks',
  //           },
  //         ],
  //       },
  //     ],
  //   },
  // };

  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    icon: pluginPkg.strapi.icon,
    id: pluginId,
    initializer: Initializer,
    injectedComponents: [],
    layout,
    lifecycles,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: App,
    name: pluginPkg.strapi.name,
    preventComponentRendering: false,
    settings,
    suffixUrl: () => '/roles',
    suffixUrlToReplaceForLeftMenuHighlight: '/roles',
    trads,
  };

  return strapi.registerPlugin(plugin);
};
