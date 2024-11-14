import { Images } from '@strapi/icons';

import pluginPkg from '../../package.json';

import { MediaLibraryDialog } from './components/MediaLibraryDialog/MediaLibraryDialog';
import { MediaLibraryInput } from './components/MediaLibraryInput/MediaLibraryInput';
import { PERMISSIONS } from './constants';
import { pluginId } from './pluginId';
import { getTrad, prefixPluginTranslations } from './utils';

import type { MediaLibraryDialogProps } from './components/MediaLibraryDialog/MediaLibraryDialog';
import type { MediaLibraryInputProps } from './components/MediaLibraryInput/MediaLibraryInput';
import type { StrapiApp } from '@strapi/admin/strapi-admin';
import type { Plugin } from '@strapi/types';

const name = pluginPkg.strapi.name;

const admin: Plugin.Config.AdminInput = {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: Images,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Media Library',
      },
      permissions: PERMISSIONS.main,
      Component: () => import('./pages/App/App').then((mod) => ({ default: mod.Upload })),
      position: 4,
    });

    app.addSettingsLink('global', {
      id: 'media-library-settings',
      to: 'media-library',
      intlLabel: {
        id: getTrad('plugin.name'),
        defaultMessage: 'Media Library',
      },
      async Component() {
        const { ProtectedSettingsPage } = await import('./pages/SettingsPage/SettingsPage');
        return { default: ProtectedSettingsPage };
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
