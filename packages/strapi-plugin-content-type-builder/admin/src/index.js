import React from 'react';
import { get } from 'lodash';
import pluginPkg from '../../package.json';
import App from './containers/App';
import Initializer from './containers/Initializer';
import Link from './InjectedComponents/ContentManager/EditViewLink';
import lifecycles from './lifecycles';
import trads from './translations';
import pluginId from './pluginId';

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
  injectedComponents: [
    {
      plugin: 'content-manager.editPage',
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
  ],
  layout: null,
  lifecycles,
  leftMenuLinks: [],
  leftMenuSections: [],
  mainComponent: Comp,
  name: pluginPkg.strapi.name,
  preventComponentRendering: false,
  suffixUrl: plugins => {
    const { uid } = get(
      plugins,
      ['content-manager', 'leftMenuSections', '0', 'links', '0'],
      { uid: '' }
    );

    return `/content-types/${uid}`;
  },

  trads,
};

export default plugin;
