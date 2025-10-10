import { PERMISSIONS } from './constants';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import type { Plugin } from '@strapi/types';

const admin: Plugin.Config.AdminInput = {
  // TODO typing app in strapi/types as every plugin needs it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(app: any) {
    // Create the email settings section
    app.createSettingSection(
      {
        id: 'email',
        intlLabel: { id: 'email.SettingsNav.section-label', defaultMessage: 'Email Plugin' },
      },
      [
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
        },
      ]
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
