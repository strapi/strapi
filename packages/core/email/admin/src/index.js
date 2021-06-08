// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import React from 'react';
import { CheckPagePermissions } from '@strapi/helper-plugin';
import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import pluginLogo from './assets/images/logo.svg';
import pluginPermissions from './permissions';
import trads from './translations';
import getTrad from './utils/getTrad';
import SettingsPage from './pages/Settings';

const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
const icon = pluginPkg.strapi.icon;
const name = pluginPkg.strapi.name;

export default {
  register(app) {
    // Create the email settings section
    app.createSection(
      {
        id: pluginId,
        intlLabel: { id: getTrad('SettingsNav.section-label'), defaultMessage: 'Email Plugin' },
      },
      [
        {
          intlLabel: {
            id: getTrad('SettingsNav.link.settings'),
            defaultMessage: 'Settings',
          },
          id: 'settings',
          to: `/settings/${pluginId}`,
          Component: () => (
            <CheckPagePermissions permissions={pluginPermissions.settings}>
              <SettingsPage />
            </CheckPagePermissions>
          ),

          permissions: pluginPermissions.settings,
        },
      ]
    );
    app.registerPlugin({
      description: pluginDescription,
      icon,
      id: pluginId,
      isReady: true,
      isRequired: pluginPkg.strapi.required || false,
      name,
      pluginLogo,
      trads,
      // settings: {
      //   menuSection: {
      //     id: pluginId,
      //     title: getTrad('SettingsNav.section-label'),
      //     links: [
      //       {
      //         title: {
      //           id: getTrad('SettingsNav.link.settings'),
      //           defaultMessage: 'Settings',
      //         },
      //         name: 'settings',
      //         to: `/settings/${pluginId}`,
      //         Component: () => (
      //           <CheckPagePermissions permissions={pluginPermissions.settings}>
      //             <SettingsPage />
      //           </CheckPagePermissions>
      //         ),
      //         permissions: pluginPermissions.settings,
      //       },
      //     ],
      //   },
      // },
    });
  },
  boot() {},
};
