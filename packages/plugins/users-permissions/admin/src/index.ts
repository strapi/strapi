import { strapi as pkgStrapi } from '../../package.json';

import { PERMISSIONS } from './constants';
import { getTrad } from './utils/getTrad';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import type { StrapiApp } from '@strapi/strapi/admin';

const name = pkgStrapi.name;

// Strapi loads the plugin registration object as the default export.
// eslint-disable-next-line import/no-default-export
export default {
  register(app: Pick<StrapiApp, 'createSettingSection' | 'registerPlugin'>) {
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
          Component: () => import('./pages/Roles/Roles').then((mod) => ({ default: mod.Roles })),
          permissions: PERMISSIONS.accessRoles,
        },
        {
          intlLabel: {
            id: getTrad('HeaderNav.link.providers'),
            defaultMessage: 'Providers',
          },
          id: 'providers',
          to: `users-permissions/providers`,
          Component: () =>
            import('./pages/Providers/Providers').then((mod) => ({
              default: mod.ProtectedProvidersPage,
            })),
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
            import('./pages/EmailTemplates/EmailTemplates').then((mod) => ({
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
            import('./pages/AdvancedSettings/AdvancedSettings').then((mod) => ({
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
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }: { default: Record<string, string> }) => {
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

    return importedTrads;
  },
};
