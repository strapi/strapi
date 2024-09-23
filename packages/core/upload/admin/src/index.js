import { Images } from '@strapi/icons';

import pluginPkg from '../../package.json';

import { MediaLibraryDialog } from './components/MediaLibraryDialog';
import { MediaLibraryInput } from './components/MediaLibraryInput';
import { PERMISSIONS } from './constants';
import pluginId from './pluginId';
import getTrad from './utils/getTrad';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: Images,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Media Library',
      },
      permissions: PERMISSIONS.main,
      Component: () => import('./pages/App'),
      position: 4,
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
