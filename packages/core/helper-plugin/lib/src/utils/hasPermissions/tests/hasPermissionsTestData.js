const hasPermissionsTestData = {
  userPermissions: {
    user1: [
      // Admin marketplace
      {
        action: 'admin::marketplace.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::marketplace.plugins.install',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::marketplace.plugins.uninstall',
        subject: null,
        properties: {},
        conditions: ['customCondition'],
      },

      // Admin webhooks
      {
        action: 'admin::webhooks.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin license
      {
        action: 'admin::license.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::license.create',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin users
      {
        action: 'admin::users.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin roles
      {
        action: 'admin::roles.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Content type builder
      {
        action: 'plugin::content-type-builder.read',
        subject: null,
        properties: {},
        conditions: null,
      },

      // Documentation plugin
      {
        action: 'plugin::documentation.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::documentation.settings.update',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::documentation.settings.regenerate',
        subject: null,
        properties: {},
        conditions: null,
      },

      // Upload plugin
      {
        action: 'plugin::upload.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::upload.assets.create',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::upload.assets.update',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::upload.assets.dowload',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::upload.assets.copy-link',
        subject: null,
        properties: {},
        conditions: null,
      },

      // Users-permissions
      {
        action: 'plugin::users-permissions.roles.create',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.roles.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.roles.update',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.roles.delete',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.email-templates.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.email-templates.update',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.providers.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.providers.update',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.advanced-settings.read',
        subject: null,
        properties: {},
        conditions: null,
      },
      {
        action: 'plugin::users-permissions.advanced-settings.update',
        subject: null,
        properties: {},
        conditions: null,
      },
    ],
    user2: [
      {
        action: 'admin::marketplace.plugins.install',
        subject: null,
        properties: {},
        conditions: ['some condition'],
      },

      // Admin webhooks
      {
        action: 'admin::webhooks.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::webhooks.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin license
      {
        action: 'admin::license.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::license.create',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin users
      {
        action: 'admin::users.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::users.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Admin roles
      {
        action: 'admin::roles.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'admin::roles.delete',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Content type builder
      {
        action: 'plugin::content-type-builder.read',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Upload plugin
      {
        action: 'plugin::upload.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::upload.assets.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::upload.assets.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::upload.assets.dowload',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::upload.assets.copy-link',
        subject: null,
        properties: {},
        conditions: [],
      },

      // Users-permissions
      {
        action: 'plugin::users-permissions.roles.create',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.roles.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.roles.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.roles.delete',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.email-templates.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.email-templates.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.providers.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.providers.update',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.advanced-settings.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        action: 'plugin::users-permissions.advanced-settings.update',
        subject: null,
        properties: {},
        conditions: [],
      },
    ],
  },
  permissionsToCheck: {
    listPlugins: [
      { action: 'admin::marketplace.read', subject: null },
      { action: 'admin::marketplace.plugins.uninstall', subject: null },
    ],
    marketplace: [
      { action: 'admin::marketplace.read', subject: null },
      { action: 'admin::marketplace.plugins.install', subject: null },
    ],
    settings: [
      // webhooks
      { action: 'admin::webhook.create', subject: null },
      { action: 'admin::webhook.read', subject: null },
      { action: 'admin::webhook.update', subject: null },
      { action: 'admin::webhook.delete', subject: null },
      // license
      { action: 'admin::license.read', subject: null },
      { action: 'admin::license.create', subject: null },
      // users
      { action: 'admin::users.create', subject: null },
      { action: 'admin::users.read', subject: null },
      { action: 'admin::users.update', subject: null },
      { action: 'admin::users.delete', subject: null },
      // roles
      { action: 'admin::roles.create', subject: null },
      { action: 'admin::roles.update', subject: null },
      { action: 'admin::roles.read', subject: null },
      { action: 'admin::roles.delete', subject: null },
      // media library
      { action: 'plugin::upload.read', subject: null },
      { action: 'plugin::upload.assets.create', subject: null },
      { action: 'plugin::upload.assets.update', subject: null },
    ],
  },
};

export default hasPermissionsTestData;
