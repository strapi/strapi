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
      to: `plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Media Library',
      },
      permissions: PERMISSIONS.main,
      Component: () => import('./pages/App'),
    });

    app.addSettingsLink('global', {
      id: 'media-library-settings',
      intlLabel: {
        id: getTrad('plugin.name'),
        defaultMessage: 'Media Library',
      },
      to: 'media-library',
      Component: () => import('./pages/SettingsPage'),
      permissions: PERMISSIONS.settings,
    });

    app.addFields({ type: 'media', Component: MediaLibraryInput });
    app.addComponents([{ name: 'media-library', Component: MediaLibraryDialog }]);

    app.registerPlugin({
      id: pluginId,
      name,
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
