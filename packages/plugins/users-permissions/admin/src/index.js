import { strapi as pkgStrapi } from '../../package.json';

import { PERMISSIONS } from './constants';
import getTrad from './utils/getTrad';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

const name = pkgStrapi.name;

export default {
  register(app) {
    // Create the plugin's settings section
    app.createSettingSection(
      {
        id: 'users-permissions',
        intlLabel: {
          id: getTrad('Settings.section-label'),
          defaultMessage: 'Users & Permissions plugin',
        },
      },
      [
        {
          intlLabel: {
            id: 'global.roles',
            defaultMessage: 'Roles',
          },
          id: 'roles',
          to: `users-permissions/roles`,
          Component: () => import('./pages/Roles'),
          permissions: PERMISSIONS.accessRoles,
        },
        {
          intlLabel: {
            id: getTrad('HeaderNav.link.providers'),
            defaultMessage: 'Providers',
          },
          id: 'providers',
          to: `users-permissions/providers`,
          Component: () => import('./pages/Providers'),
          permissions: PERMISSIONS.readProviders,
        },
        {
          intlLabel: {
            id: getTrad('HeaderNav.link.emailTemplates'),
            defaultMessage: 'Email templates',
          },
          id: 'email-templates',
          to: `users-permissions/email-templates`,
          Component: () =>
            import('./pages/EmailTemplates').then((mod) => ({
              default: mod.ProtectedEmailTemplatesPage,
            })),
          permissions: PERMISSIONS.readEmailTemplates,
        },
        {
          intlLabel: {
            id: getTrad('HeaderNav.link.advancedSettings'),
            defaultMessage: 'Advanced Settings',
          },
          id: 'advanced-settings',
          to: `users-permissions/advanced-settings`,
          Component: () =>
            import('./pages/AdvancedSettings').then((mod) => ({
              default: mod.ProtectedAdvancedSettingsPage,
            })),
          permissions: PERMISSIONS.readAdvancedSettings,
        },
      ]
    );

    app.registerPlugin({
      id: 'users-permissions',
      name,
    });
  },
  bootstrap() {},
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, 'users-permissions'),
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
