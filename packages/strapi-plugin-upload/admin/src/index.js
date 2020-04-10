// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import App from './containers/App';
import Initializer from './containers/Initializer';
import SettingsPage from './containers/SettingsPage';
import InputMedia from './components/InputMedia';
import InputModalStepper from './containers/InputModalStepper';

import trads from './translations';
import pluginId from './pluginId';
import { getTrad } from './utils';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    fileModel: null,
    icon: pluginPkg.strapi.icon,
    id: pluginId,
    initializer: Initializer,
    injectedComponents: [],
    isReady: false,
    isRequired: pluginPkg.strapi.required || false,
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
            id: getTrad('plugin.name'),
            defaultMessage: 'Media Library',
          },
          name: 'media-library',
          to: `${strapi.settingsBaseURL}/media-library`,
          Component: SettingsPage,
        },
      ],
    },
    trads,
  };

  strapi.registerComponent({ name: 'media-library', Component: InputModalStepper });
  strapi.registerField({ type: 'media', Component: InputMedia });

  return strapi.registerPlugin(plugin);
};
