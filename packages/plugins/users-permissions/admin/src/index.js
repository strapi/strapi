// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.0.0-beta.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED
import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import pluginPermissions from './permissions';
import pluginId from './pluginId';
import trads from './translations';
import RolesPage from './pages/Roles';
import ProvidersPage from './pages/Providers';
import EmailTemplatesPage from './pages/EmailTemplates';
import AdvancedSettingsPage from './pages/AdvancedSettings';
import getTrad from './utils/getTrad';

const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
const icon = pluginPkg.strapi.icon;
const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.registerPlugin({
      description: pluginDescription,
      icon,
      id: pluginId,
      isReady: true,
      isRequired: pluginPkg.strapi.required || false,
      name,
      pluginLogo,
      trads,
      // TODO
      settings: {
        menuSection: {
          id: pluginId,
          title: getTrad('Settings.section-label'),
          links: [
            {
              title: {
                id: getTrad('HeaderNav.link.roles'),
                defaultMessage: 'Roles',
              },
              name: 'roles',
              to: `/settings/${pluginId}/roles`,
              Component: () => (
                <CheckPagePermissions permissions={pluginPermissions.accessRoles}>
                  <RolesPage />
                </CheckPagePermissions>
              ),
              permissions: pluginPermissions.accessRoles,
            },
            {
              title: {
                id: getTrad('HeaderNav.link.providers'),
                defaultMessage: 'Providers',
              },
              name: 'providers',
              to: `/settings/${pluginId}/providers`,
              Component: () => (
                <CheckPagePermissions permissions={pluginPermissions.readProviders}>
                  <ProvidersPage />
                </CheckPagePermissions>
              ),
              permissions: pluginPermissions.readProviders,
            },
            {
              title: {
                id: getTrad('HeaderNav.link.email-templates'),
                defaultMessage: 'Email templates',
              },
              name: 'email-templates',
              to: `/settings/${pluginId}/email-templates`,
              Component: () => (
                <CheckPagePermissions permissions={pluginPermissions.readEmailTemplates}>
                  <EmailTemplatesPage />
                </CheckPagePermissions>
              ),
              permissions: pluginPermissions.readEmailTemplates,
            },
            {
              title: {
                id: getTrad('HeaderNav.link.advanced-settings'),
                defaultMessage: 'Advanced Settings',
              },
              name: 'advanced-settings',
              to: `/settings/${pluginId}/advanced-settings`,
              Component: () => (
                <CheckPagePermissions permissions={pluginPermissions.readAdvancedSettings}>
                  <AdvancedSettingsPage />
                </CheckPagePermissions>
              ),
              permissions: pluginPermissions.readAdvancedSettings,
            },
          ],
        },
      },
    });
  },
  boot() {},
};
