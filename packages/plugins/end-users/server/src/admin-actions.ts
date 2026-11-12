import { PLUGIN_ID } from './constants';

/**
 * The actions an admin user is granted to manage end users, registered with the admin RBAC engine
 * when the plugin boots. Each shows up in the admin role editor under Plugins, and is checked by the
 * `admin::hasPermissions` policy on the admin routes. The action id is
 * `plugin::end-users.<uid>`.
 */
export const ROLE_ACTIONS = {
  read: `plugin::${PLUGIN_ID}.roles.read`,
  create: `plugin::${PLUGIN_ID}.roles.create`,
  update: `plugin::${PLUGIN_ID}.roles.update`,
  delete: `plugin::${PLUGIN_ID}.roles.delete`,
} as const;

/**
 * The actions on conditions: `read` lists them and, like `roles.read`, opens the permission layout,
 * which the condition builder needs; `update` is for the builder's writes.
 */
export const CONDITION_ACTIONS = {
  read: `plugin::${PLUGIN_ID}.conditions.read`,
  update: `plugin::${PLUGIN_ID}.conditions.update`,
} as const;

/** The actions on the settings document: `read` shows it and the config summary, `update` saves it. */
export const SETTINGS_ACTIONS = {
  read: `plugin::${PLUGIN_ID}.settings.read`,
  update: `plugin::${PLUGIN_ID}.settings.update`,
} as const;

/**
 * The actions on the sign-in providers: `read` lists them, `update` saves, creates and deletes.
 * `custom` is for what can make an identity provider the admin controls sign in as an end user:
 * making or editing a custom OpenID Connect provider, and changing "trust for linking". An admin
 * who holds only `update` keeps to the plain settings (client id, secret, enabled) of a provider.
 */
export const PROVIDER_ACTIONS = {
  read: `plugin::${PLUGIN_ID}.providers.read`,
  update: `plugin::${PLUGIN_ID}.providers.update`,
  custom: `plugin::${PLUGIN_ID}.providers.custom`,
} as const;

/**
 * The action on one end user's Security panel in the Content Manager: resetting two-factor,
 * unlinking sign-in methods, sending a password reset or verification email, signing the user out
 * and banning. It is held beside the Content Manager's own update permission on the end-user type,
 * which alone is not enough: that permission is a routine editor's, and these changes can take an
 * account over.
 */
export const USER_SECURITY_ACTIONS = {
  manage: `plugin::${PLUGIN_ID}.security.manage`,
} as const;

export const ADMIN_ACTIONS = [
  {
    section: 'plugins',
    displayName: 'Read',
    uid: 'roles.read',
    subCategory: 'roles',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Create',
    uid: 'roles.create',
    subCategory: 'roles',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Update',
    uid: 'roles.update',
    subCategory: 'roles',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Delete',
    uid: 'roles.delete',
    subCategory: 'roles',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Read',
    uid: 'conditions.read',
    subCategory: 'conditions',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Update',
    uid: 'conditions.update',
    subCategory: 'conditions',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Read',
    uid: 'settings.read',
    subCategory: 'settings',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Update',
    uid: 'settings.update',
    subCategory: 'settings',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Read',
    uid: 'providers.read',
    subCategory: 'providers',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Update',
    uid: 'providers.update',
    subCategory: 'providers',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Manage custom providers and account linking',
    uid: 'providers.custom',
    subCategory: 'providers',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Manage the Security panel of end users',
    uid: 'security.manage',
    subCategory: 'security',
    pluginName: PLUGIN_ID,
  },
];
