const pluginPermissions = {
  // Roles
  accessRoles: [
    { action: 'plugins::users-permissions.roles.create', subject: null },
    { action: 'plugins::users-permissions.roles.read', subject: null },
  ],
  createRole: [{ action: 'plugins::users-permissions.roles.create', subject: null }],
  deleteRole: [{ action: 'plugins::users-permissions.roles.delete', subject: null }],
  readRoles: [{ action: 'plugins::users-permissions.roles.read', subject: null }],
  updateRole: [{ action: 'plugins::users-permissions.roles.update', subject: null }],

  // AdvancedSettings
  readAdvancedSettings: [
    { action: 'plugins::users-permissions.advanced-settings.read', subject: null },
  ],
  updateAdvancedSettings: [
    { action: 'plugins::users-permissions.advanced-settings.update', subject: null },
  ],

  // Emails
  readEmailTemplates: [
    { action: 'plugins::users-permissions.email-templates.read', subject: null },
  ],
  updateEmailTemplates: [
    { action: 'plugins::users-permissions.email-templates.update', subject: null },
  ],

  // Providers
  readProviders: [{ action: 'plugins::users-permissions.providers.read', subject: null }],
  updateProviders: [{ action: 'plugins::users-permissions.providers.update', subject: null }],
};

export default pluginPermissions;
