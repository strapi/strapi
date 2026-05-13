import { PERMISSIONS } from './constants';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import {
  importLocaleJsonWithLegacyDkFallback,
  type StrapiApp,
} from '@strapi/admin/strapi-admin';
import type { Plugin } from '@strapi/types';

const admin: Plugin.Config.AdminInput = {
  // TODO typing app in strapi/types as every plugin needs it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(app: StrapiApp) {
    // Create the email settings section
    app.addSettingsLink(
      {
        id: 'email',
        intlLabel: { id: 'email.SettingsNav.section-label', defaultMessage: 'Email Plugin' },
      },
      {
        intlLabel: {
          id: 'email.Settings.email.plugin.title',
          defaultMessage: 'Settings',
        },
        id: 'settings',
        to: 'email',
        Component: () =>
          import('./pages/Settings').then((mod) => ({
            default: mod.ProtectedSettingsPage,
          })),
        permissions: PERMISSIONS.settings,
      }
    );
    app.registerPlugin({
      id: 'email',
      name: 'email',
    });
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  bootstrap() {},
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map(async (locale) => {
        const data = await importLocaleJsonWithLegacyDkFallback(locale, (code) =>
          import(`./translations/${code}.json`)
        );

        return {
          data: prefixPluginTranslations(data, 'email'),
          locale,
        };
      })
    );

    return importedTrads;
  },
};

// eslint-disable-next-line import/no-default-export
export default admin;
