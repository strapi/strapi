import { Images } from '@strapi/icons';

import pluginPkg from '../../package.json';

import { MediaLibraryDialog } from './components/MediaLibraryDialog';
import { MediaLibraryInput } from './components/MediaLibraryInput';
import type { MediaLibraryDialogProps } from './components/MediaLibraryDialog';
import type { MediaLibraryInputProps } from './components/MediaLibraryInput';

// TODO: replace this import with the import from constants file when it will be migrated to TS
import { PERMISSIONS } from './newConstants';
import pluginId from './pluginId';
import { getTrad, prefixPluginTranslations } from './utils';
import type { StrapiApp } from '@strapi/admin/strapi-admin';

const name = pluginPkg.strapi.name;

export default {
  register(app: StrapiApp) {
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

    app.addFields({
      type: 'media',
      Component: MediaLibraryInput as React.FC<Partial<MediaLibraryInputProps>>,
    });
    app.addComponents([
      {
        name: 'media-library',
        Component: MediaLibraryDialog as React.FC<Partial<MediaLibraryDialogProps>>,
      },
    ]);

    app.registerPlugin({
      id: pluginId,
      name,
    });
  },
  async registerTrads({ locales }: { locales: string[] }) {
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
