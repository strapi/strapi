import { PERMISSIONS } from './constants';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import type { PluginDefinition } from '@strapi/admin/strapi-admin';

const admin: PluginDefinition = {
  register(app) {
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
  bootstrap() {},
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, 'email'),
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
