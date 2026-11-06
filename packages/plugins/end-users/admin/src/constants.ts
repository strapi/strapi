/**
 * The admin RBAC actions the plugin's server registers (`server/src/admin-actions.ts`), as the
 * `{ action, subject }` lists the settings links, `useRBAC` and `Page.Protect` take.
 */
export const PERMISSIONS = {
  roles: {
    read: [{ action: 'plugin::end-users.roles.read', subject: null }],
    create: [{ action: 'plugin::end-users.roles.create', subject: null }],
    update: [{ action: 'plugin::end-users.roles.update', subject: null }],
    delete: [{ action: 'plugin::end-users.roles.delete', subject: null }],
  },
  conditions: {
    read: [{ action: 'plugin::end-users.conditions.read', subject: null }],
    update: [{ action: 'plugin::end-users.conditions.update', subject: null }],
  },
  providers: {
    read: [{ action: 'plugin::end-users.providers.read', subject: null }],
    update: [{ action: 'plugin::end-users.providers.update', subject: null }],
  },
  settings: {
    read: [{ action: 'plugin::end-users.settings.read', subject: null }],
    update: [{ action: 'plugin::end-users.settings.update', subject: null }],
  },
};

/** The email plugin's templates page, filtered to the templates this plugin registers */
export const EMAIL_TEMPLATES_PATH = 'email/templates?prefix=end-users.';

/** What an administrator needs to read the email plugin's templates (owned by that plugin) */
export const EMAIL_TEMPLATES_PERMISSIONS = [
  { action: 'plugin::email.templates.read', subject: null },
];
