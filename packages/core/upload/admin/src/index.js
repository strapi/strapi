// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED
import { prefixPluginTranslations } from '@strapi/helper-plugin';

import pluginPkg from '../../package.json';

import { MediaLibraryDialog } from './components/MediaLibraryDialog';
import { MediaLibraryInput } from './components/MediaLibraryInput';
import PluginIcon from './components/PluginIcon';
import { PERMISSIONS } from './constants';
import pluginId from './pluginId';
import getTrad from './utils/getTrad';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Media Library',
      },
      permissions: PERMISSIONS.main,
      async Component() {
        const component = await import('./pages/App');

        return component;
      },
    });

    app.addFields({ type: 'media', Component: MediaLibraryInput });
    app.addComponents([{ name: 'media-library', Component: MediaLibraryDialog }]);

    app.registerPlugin({
      id: pluginId,
      name,
    });
  },
  bootstrap(app) {
    app.addSettingsLink('global', {
      id: 'media-library-settings',
      intlLabel: {
        id: getTrad('plugin.name'),
        defaultMessage: 'Media Library',
      },
      to: '/settings/media-library',
      async Component() {
        const component = await import('./pages/SettingsPage');

        return component;
      },
      permissions: PERMISSIONS.settings,
    });
  },
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  },
};
