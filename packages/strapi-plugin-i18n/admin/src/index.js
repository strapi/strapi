import React from 'react';
import pluginPkg from '../../package.json';
import middlewares from './middlewares';
import pluginId from './pluginId';
import pluginLogo from './assets/images/logo.svg';
import trads from './translations';
import { getTrad } from './utils';
import SettingsPage from './containers/SettingsPage';
import pluginPermissions from './permissions';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

  middlewares.forEach(middleware => {
    strapi.middlewares.add(middleware);
  });

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
    mainComponent: null,
    name: pluginPkg.strapi.name,
    pluginLogo,
    preventComponentRendering: false,
    settings: {
      global: {
        links: [
          {
            title: {
              id: getTrad('plugin.name'),
              defaultMessage: 'Internationalization',
            },
            name: 'internationalization',
            to: `${strapi.settingsBaseURL}/internationalization`,
            Component: () => <SettingsPage />,
            permissions: pluginPermissions.accessMain,
          },
        ],
      },
    },
    trads,
  };

  return strapi.registerPlugin(plugin);
};
