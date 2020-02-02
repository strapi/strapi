// FIXME: eslint-disable
/* eslint-disable */
import App from './containers/App';
import Initializer from './utils/Initializer';
import lifecycles from './lifecycles';
import pluginId from './pluginId';
import pluginPkg from '../../package.json';
import React from 'react';
import trads from './translations';

const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

function Comp(props) {
  return <App {...props} />;
}

const plugin = {
  blockerComponent: null,
  blockerComponentProps: {},
  description: pluginDescription,
  icon: pluginPkg.strapi.icon,
  id: pluginId,
  initializer: Initializer,
  injectedComponents: [],
  isReady: false,
  layout: null,
  lifecycles,
  leftMenuLinks: [],
  leftMenuSections: [],
  mainComponent: Comp,
  name: pluginPkg.strapi.name,
  preventComponentRendering: false,
  trads,
};

export default plugin;
