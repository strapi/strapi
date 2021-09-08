const pluginPermissions = {
  // Roles
  accessRoles: [
    { action: 'plugin::users-permissions.roles.create', subject: null },
    { action: 'plugin::users-permissions.roles.read', subject: null },
  ],
  createRole: [{ action: 'plugin::users-permissions.roles.create', subject: null }],
  deleteRole: [{ action: 'plugin::users-permissions.roles.delete', subject: null }],
  readRoles: [{ action: 'plugin::users-permissions.roles.read', subject: null }],
  updateRole: [{ action: 'plugin::users-permissions.roles.update', subject: null }],

  // AdvancedSettings
  readAdvancedSettings: [
    { action: 'plugin::users-permissions.advanced-settings.read', subject: null },
  ],
  updateAdvancedSettings: [
    { action: 'plugin::users-permissions.advanced-settings.update', subject: null },
  ],

  // Emails
  readEmailTemplates: [{ action: 'plugin::users-permissions.email-templates.read', subject: null }],
  updateEmailTemplates: [
    { action: 'plugin::users-permissions.email-templates.update', subject: null },
  ],

  // Providers
  readProviders: [{ action: 'plugin::users-permissions.providers.read', subject: null }],
  updateProviders: [{ action: 'plugin::users-permissions.providers.update', subject: null }],
};

export default pluginPermissions;
