import { PermissionMap } from './types/permissions';

import type { StrapiAppSettingLink } from './core/apis/router';

export const ADMIN_PERMISSIONS_CE = {
  contentManager: {
    main: [],
    collectionTypesConfigurations: [
      {
        action: 'plugin::content-manager.collection-types.configure-view',
        subject: null,
      },
    ],
    componentsConfigurations: [
      {
        action: 'plugin::content-manager.components.configure-layout',
        subject: null,
      },
    ],
    singleTypesConfigurations: [
      {
        action: 'plugin::content-manager.single-types.configure-view',
        subject: null,
      },
    ],
  },
  marketplace: {
    main: [{ action: 'admin::marketplace.read', subject: null }],
    read: [{ action: 'admin::marketplace.read', subject: null }],
  },
  settings: {
    roles: {
      main: [
        { action: 'admin::roles.create', subject: null },
        { action: 'admin::roles.update', subject: null },
        { action: 'admin::roles.read', subject: null },
        { action: 'admin::roles.delete', subject: null },
      ],
      create: [{ action: 'admin::roles.create', subject: null }],
      delete: [{ action: 'admin::roles.delete', subject: null }],
      read: [{ action: 'admin::roles.read', subject: null }],
      update: [{ action: 'admin::roles.update', subject: null }],
    },
    users: {
      main: [
        { action: 'admin::users.create', subject: null },
        { action: 'admin::users.read', subject: null },
        { action: 'admin::users.update', subject: null },
        { action: 'admin::users.delete', subject: null },
      ],
      create: [{ action: 'admin::users.create', subject: null }],
      delete: [{ action: 'admin::users.delete', subject: null }],
      read: [{ action: 'admin::users.read', subject: null }],
      update: [{ action: 'admin::users.update', subject: null }],
    },
    webhooks: {
      main: [
        { action: 'admin::webhooks.create', subject: null },
        { action: 'admin::webhooks.read', subject: null },
        { action: 'admin::webhooks.update', subject: null },
        { action: 'admin::webhooks.delete', subject: null },
      ],
      create: [{ action: 'admin::webhooks.create', subject: null }],
      delete: [{ action: 'admin::webhooks.delete', subject: null }],
      read: [
        { action: 'admin::webhooks.read', subject: null },
        // NOTE: We need to check with the API
        { action: 'admin::webhooks.update', subject: null },
        { action: 'admin::webhooks.delete', subject: null },
      ],
      update: [{ action: 'admin::webhooks.update', subject: null }],
    },
    'api-tokens': {
      main: [{ action: 'admin::api-tokens.access', subject: null }],
      create: [{ action: 'admin::api-tokens.create', subject: null }],
      delete: [{ action: 'admin::api-tokens.delete', subject: null }],
      read: [{ action: 'admin::api-tokens.read', subject: null }],
      update: [{ action: 'admin::api-tokens.update', subject: null }],
      regenerate: [{ action: 'admin::api-tokens.regenerate', subject: null }],
    },
    'transfer-tokens': {
      main: [{ action: 'admin::transfer.tokens.access', subject: null }],
      create: [{ action: 'admin::transfer.tokens.create', subject: null }],
      delete: [{ action: 'admin::transfer.tokens.delete', subject: null }],
      read: [{ action: 'admin::transfer.tokens.read', subject: null }],
      update: [{ action: 'admin::transfer.tokens.update', subject: null }],
      regenerate: [{ action: 'admin::transfer.tokens.regenerate', subject: null }],
    },
    'project-settings': {
      read: [{ action: 'admin::project-settings.read', subject: null }],
      update: [{ action: 'admin::project-settings.update', subject: null }],
    },
    plugins: {
      main: [{ action: 'admin::marketplace.read', subject: null }],
      read: [{ action: 'admin::marketplace.read', subject: null }],
    },
  },
} satisfies Partial<PermissionMap>;

export const HOOKS = {
  /**
   * Hook that allows to mutate the displayed headers of the list view table
   * @constant
   * @type {string}
   */
  INJECT_COLUMN_IN_TABLE: 'Admin/CM/pages/ListView/inject-column-in-table',

  /**
   * Hook that allows to mutate the CM's collection types links pre-set filters
   * @constant
   * @type {string}
   */
  MUTATE_COLLECTION_TYPES_LINKS: 'Admin/CM/pages/App/mutate-collection-types-links',

  /**
   * Hook that allows to mutate the CM's edit view layout
   * @constant
   * @type {string}
   */
  MUTATE_EDIT_VIEW_LAYOUT: 'Admin/CM/pages/EditView/mutate-edit-view-layout',

  /**
   * Hook that allows to mutate the CM's single types links pre-set filters
   * @constant
   * @type {string}
   */
  MUTATE_SINGLE_TYPES_LINKS: 'Admin/CM/pages/App/mutate-single-types-links',
};

export interface SettingsMenuLink
  extends Omit<StrapiAppSettingLink, 'Component' | 'permissions' | 'licenseOnly'> {
  licenseOnly?: boolean;
}

export type SettingsMenu = {
  admin: SettingsMenuLink[];
  global: SettingsMenuLink[];
};

export const SETTINGS_LINKS_CE = (): SettingsMenu => ({
  global: [
    {
      intlLabel: { id: 'Settings.application.title', defaultMessage: 'Overview' },
      to: '/settings/application-infos',
      id: '000-application-infos',
    },
    {
      intlLabel: { id: 'Settings.webhooks.title', defaultMessage: 'Webhooks' },
      to: '/settings/webhooks',
      id: 'webhooks',
    },
    {
      intlLabel: { id: 'Settings.apiTokens.title', defaultMessage: 'API Tokens' },
      to: '/settings/api-tokens?sort=name:ASC',
      id: 'api-tokens',
    },
    {
      intlLabel: { id: 'Settings.transferTokens.title', defaultMessage: 'Transfer Tokens' },
      to: '/settings/transfer-tokens?sort=name:ASC',
      id: 'transfer-tokens',
    },
    {
      intlLabel: {
        id: 'global.plugins',
        defaultMessage: 'Plugins',
      },
      to: '/settings/list-plugins',
      id: 'plugins',
    },
    // If the Enterprise/Cloud feature is not enabled and if the config doesn't disable it, we promote the Enterprise/Cloud feature by displaying them in the settings menu.
    // Disable this by adding "promoteEE: false" to your `./config/admin.js` file
    ...(!window.strapi.features.isEnabled(window.strapi.features.SSO) &&
    window.strapi?.flags?.promoteEE
      ? [
          {
            intlLabel: { id: 'Settings.sso.title', defaultMessage: 'Single Sign-On' },
            to: '/settings/purchase-single-sign-on',
            id: 'sso-purchase-page',
            licenseOnly: true,
          },
        ]
      : []),
  ],

  admin: [
    {
      intlLabel: { id: 'global.roles', defaultMessage: 'Roles' },
      to: '/settings/roles',
      id: 'roles',
    },
    {
      intlLabel: { id: 'global.users', defaultMessage: 'Users' },
      // Init the search params directly
      to: '/settings/users?pageSize=10&page=1&sort=firstname',
      id: 'users',
    },
    ...(!window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS) &&
    window.strapi?.flags?.promoteEE
      ? [
          {
            intlLabel: { id: 'global.auditLogs', defaultMessage: 'Audit Logs' },
            to: '/settings/purchase-audit-logs',
            id: 'auditLogs-purchase-page',
            licenseOnly: true,
          },
        ]
      : []),
  ],
});
