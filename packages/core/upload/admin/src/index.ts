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
import type { StrapiApp } from '@strapi/admin/strapi-admin';
import type { Plugin } from '@strapi/types';

const name = pluginPkg.strapi.name;

const admin: Plugin.Config.AdminInput = {
  register(app: StrapiApp) {
    /**
     * Whichever Media Library is selected owns `plugins/upload` outright: the other is
     * not registered at all, so there is exactly one Media Library entry in the menu.
     *
     * The new one is the default; `useLegacyMediaLibrary` opts back out.
     */
    const isLegacyMediaLibrary = window.strapi.featureFlags.isEnabled('useLegacyMediaLibrary');

    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: Images,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Media Library',
      },
      permissions: PERMISSIONS.main,
      Component: isLegacyMediaLibrary
        ? () => {
            return import('./pages/App/App').then((mod) => ({ default: mod.Upload }));
          }
        : () => {
            return import('./future/App').then((mod) => ({
              default: mod.BetaMediaLibrary,
            }));
          },
      position: 4,
    });

    if (!isLegacyMediaLibrary) {
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
