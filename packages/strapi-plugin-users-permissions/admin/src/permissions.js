const pluginPermissions = {
  // This permission regards the main component (App) and is used to tell
  // If the plugin link should be displayed in the menu
  // And also if the plugin is accessible. This use case is found when a user types the url of the
  // plugin directly in the browser
  main: [
    { action: 'plugins::users-permissions.advanced-settings.read', subject: null },
    { action: 'plugins::users-permissions.email-templates.read', subject: null },
    { action: 'plugins::users-permissions.providers.read', subject: null },
    { action: 'plugins::users-permissions.roles.read', subject: null },
  ],
  createRole: [{ action: 'plugins::users-permissions.roles.create', subject: null }],
  readAdvancedSettings: [
    { action: 'plugins::users-permissions.advanced-settings.read', subject: null },
    { action: 'plugins::users-permissions.advanced-settings.update', subject: null },
  ],
  updateAdvancedSettings: [
    { action: 'plugins::users-permissions.advanced-settings.update', subject: null },
  ],
  readEmailTemplates: [
    { action: 'plugins::users-permissions.email-templates.read', subject: null },
    { action: 'plugins::users-permissions.email-templates.update', subject: null },
  ],
  updateEmailTemplates: [
    { action: 'plugins::users-permissions.email-templates.update', subject: null },
  ],
  readProviders: [
    { action: 'plugins::users-permissions.providers.read', subject: null },
    { action: 'plugins::users-permissions.providers.update', subject: null },
  ],
  updateProviders: [{ action: 'plugins::users-permissions.providers.update', subject: null }],
  readRoles: [
    { action: 'plugins::users-permissions.roles.read', subject: null },
    { action: 'plugins::users-permissions.roles.update', subject: null },
  ],
  updateRole: [{ action: 'plugins::users-permissions.roles.update', subject: null }],
  deleteRole: [{ action: 'plugins::users-permissions.roles.delete', subject: null }],
};

export default pluginPermissions;
