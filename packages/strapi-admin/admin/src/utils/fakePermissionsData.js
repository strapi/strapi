const data = {
  user1: [
    // Admin marketplace
    {
      action: 'admin::marketplace.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::marketplace.plugins.install',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::marketplace.plugins.uninstall',
      subject: null,
      fields: null,
      conditions: ['customCondition'],
    },

    // Admin webhooks
    {
      action: 'admin::webhooks.create',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::webhooks.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::webhooks.update',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::webhooks.delete',
      subject: null,
      fields: null,
      conditions: [],
    },

    // Admin users
    {
      action: 'admin::users.create',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::users.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::users.update',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::users.delete',
      subject: null,
      fields: null,
      conditions: [],
    },

    // Admin roles
    {
      action: 'admin::roles.create',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::roles.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::roles.update',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::roles.delete',
      subject: null,
      fields: null,
      conditions: [],
    },

    // Content type builder
    {
      action: 'plugins::content-type-builder.read',
      subject: null,
      fields: null,
      conditions: null,
    },

    // Documentation plugin
    {
      action: 'plugins::documentation.read',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::documentation.settings.update',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::documentation.settings.regenerate',
      subject: null,
      fields: null,
      conditions: null,
    },

    // Upload plugin
    {
      action: 'plugins::upload.read',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::upload.assets.create',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::upload.assets.update',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::upload.assets.dowload',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::upload.assets.copy-link',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::upload.settings.read',
      subject: null,
      fields: null,
      conditions: null,
    },

    // Users-permissions
    {
      action: 'plugins::users-permissions.roles.create',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::users-permissions.roles.read',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::users-permissions.roles.update',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::users-permissions.roles.delete',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::users-permissions.email-templates.read',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::users-permissions.email-templates.update',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::users-permissions.providers.read',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::users-permissions.providers.update',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::users-permissions.advanced-settings.read',
      subject: null,
      fields: null,
      conditions: null,
    },
    {
      action: 'plugins::users-permissions.advanced-settings.update',
      subject: null,
      fields: null,
      conditions: null,
    },
  ],
  user2: [
    // Admin marketplace
    // {
    //   action: 'admin::marketplace.read',
    //   subject: null,
    //   fields: null,
    //   conditions: [],
    // },
    {
      action: 'admin::marketplace.plugins.install',
      subject: null,
      fields: null,
      conditions: ['some condition'],
    },
    // {
    //   action: 'admin::marketplace.plugins.uninstall',
    //   subject: null,
    //   fields: null,
    //   conditions: [],
    // },

    // Admin webhooks
    {
      action: 'admin::webhooks.create',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::webhooks.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::webhooks.update',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::webhooks.delete',
      subject: null,
      fields: null,
      conditions: [],
    },

    // Admin users
    {
      action: 'admin::users.create',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::users.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::users.update',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::users.delete',
      subject: null,
      fields: null,
      conditions: [],
    },

    // Admin roles
    {
      action: 'admin::roles.create',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::roles.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::roles.update',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'admin::roles.delete',
      subject: null,
      fields: null,
      conditions: [],
    },

    // Content type builder
    {
      action: 'plugins::content-type-builder.read',
      subject: null,
      fields: null,
      conditions: [],
    },

    // Documentation plugin
    // {
    //   action: 'plugins::documentation.read',
    //   subject: null,
    //   fields: null,
    //   conditions:[],
    // },
    // {
    //   action: 'plugins::documentation.settings.update',
    //   subject: null,
    //   fields: null,
    //   conditions:[],
    // },
    // {
    //   action: 'plugins::documentation.settings.regenerate',
    //   subject: null,
    //   fields: null,
    //   conditions:[],
    // },

    // Upload plugin
    // {
    //   action: 'plugins::upload.read',
    //   subject: null,
    //   fields: null,
    //   conditions: [],
    // },
    {
      action: 'plugins::upload.assets.create',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::upload.assets.update',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::upload.assets.dowload',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::upload.assets.copy-link',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::upload.settings.read',
      subject: null,
      fields: null,
      conditions: null,
    },

    // Users-permissions
    {
      action: 'plugins::users-permissions.roles.create',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::users-permissions.roles.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::users-permissions.roles.update',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::users-permissions.roles.delete',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::users-permissions.email-templates.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::users-permissions.email-templates.update',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::users-permissions.providers.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::users-permissions.providers.update',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::users-permissions.advanced-settings.read',
      subject: null,
      fields: null,
      conditions: [],
    },
    {
      action: 'plugins::users-permissions.advanced-settings.update',
      subject: null,
      fields: null,
      conditions: [],
    },
  ],
};

export default data;
