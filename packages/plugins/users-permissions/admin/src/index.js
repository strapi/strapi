// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED
import { prefixPluginTranslations } from '@strapi/helper-plugin';

import pluginPkg from '../../package.json';

import { PERMISSIONS } from './constants';
import getTrad from './utils/getTrad';

const name = pluginPkg.strapi.name;

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
          to: `/settings/users-permissions/roles`,
          Component: () =>
            import(/* webpackChunkName: "users-roles-settings-page" */ './pages/Roles'),
          permissions: PERMISSIONS.accessRoles,
        },
        {
          intlLabel: {
            id: getTrad('HeaderNav.link.providers'),
            defaultMessage: 'Providers',
          },
          id: 'providers',
          to: `/settings/users-permissions/providers`,
          Component: () =>
            import(/* webpackChunkName: "users-providers-settings-page" */ './pages/Providers'),
          permissions: PERMISSIONS.readProviders,
        },
        {
          intlLabel: {
            id: getTrad('HeaderNav.link.emailTemplates'),
            defaultMessage: 'Email templates',
          },
          id: 'email-templates',
          to: `/settings/users-permissions/email-templates`,
          Component: () =>
            import(/* webpackChunkName: "users-email-settings-page" */ './pages/EmailTemplates'),
          permissions: PERMISSIONS.readEmailTemplates,
        },
        {
          intlLabel: {
            id: getTrad('HeaderNav.link.advancedSettings'),
            defaultMessage: 'Advanced Settings',
          },
          id: 'advanced-settings',
          to: `/settings/users-permissions/advanced-settings`,
          Component: () =>
            import(
              /* webpackChunkName: "users-advanced-settings-page" */ './pages/AdvancedSettings'
            ),
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
        return import(
          /* webpackChunkName: "users-permissions-translation-[request]" */ `./translations/${locale}.json`
        )
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
