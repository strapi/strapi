import { Images } from '@strapi/icons';

import pluginPkg from '../../package.json';

import { MediaLibraryDialog } from './components/MediaLibraryDialog/MediaLibraryDialog';
import { MediaLibraryInput } from './components/MediaLibraryInput/MediaLibraryInput';
import { PERMISSIONS } from './constants';
import { UploadProgressDialog } from './future/components/UploadProgressDialog';
import { uploadProgressReducer } from './future/store/uploadProgress';
import { pluginId } from './pluginId';
import { getTrad, prefixPluginTranslations } from './utils';

import type { MediaLibraryDialogProps } from './components/MediaLibraryDialog/MediaLibraryDialog';
import type { MediaLibraryInputProps } from './components/MediaLibraryInput/MediaLibraryInput';
import type { PluginDefinition } from '@strapi/admin/strapi-admin';

const name = pluginPkg.strapi.name;

const admin: PluginDefinition = {
  register(app) {
    /**
     * The beta Media Library owns `plugins/upload` outright when the flag is on:
     * the legacy app is not registered at all, so there is exactly one Media
     * Library entry in the menu and no route to rename at GA.
     */
    const isBetaMediaLibrary = window.strapi.future.isEnabled('betaMediaLibrary');

    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: Images,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Media Library',
      },
      permissions: PERMISSIONS.main,
      Component: isBetaMediaLibrary
        ? () => {
            return import('./future/App').then((mod) => ({
              default: mod.BetaMediaLibrary,
            }));
          }
        : () => {
            return import('./pages/App/App').then((mod) => ({ default: mod.Upload }));
          },
      position: 4,
    });

    if (isBetaMediaLibrary) {
      app.addReducers({ uploadProgress: uploadProgressReducer });

      app.addComponents([
        {
          name: 'future-global::upload-progress',
          Component: UploadProgressDialog,
        },
      ]);
    }

    app.addSettingsLink('global', {
      id: 'media-library-settings',
      to: 'media-library',
      intlLabel: {
        id: getTrad('plugin.name'),
        defaultMessage: 'Media Library',
      },
      Component() {
        return import('./pages/SettingsPage/SettingsPage').then((mod) => ({
          default: mod.ProtectedSettingsPage,
        }));
      },
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

// eslint-disable-next-line import/no-default-export
export default admin;
