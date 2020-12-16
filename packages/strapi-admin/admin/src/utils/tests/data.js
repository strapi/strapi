const data = {
  contentTypesPermissions: {
    'plugins::users-permissions.user': {
      conditions: [],
      attributes: {
        email: {
          actions: [
            'plugins::content-manager.explorer.create',
            'plugins::content-manager.explorer.update',
          ],
        },
        firstname: {
          actions: [
            'plugins::content-manager.explorer.create',
            'plugins::content-manager.explorer.update',
          ],
        },
        lastname: {
          actions: [
            'plugins::content-manager.explorer.create',
            'plugins::content-manager.explorer.update',
          ],
        },
        'role.data.name': {
          actions: ['plugins::content-manager.explorer.read'],
        },
        roles: {
          actions: ['plugins::content-manager.explorer.create'],
        },
      },
    },
    'application::category.category': {
      conditions: {
        'plugins::content-manager.explorer.delete': ['is_creator'],
        'plugins::content-manager.explorer.read': ['is_someone', 'is_someone_else'],
      },
      contentTypeActions: {
        'plugins::content-manager.explorer.delete': true,
      },
      attributes: {
        name: {
          actions: ['plugins::content-manager.explorer.read'],
        },
        addresses: {
          actions: ['plugins::content-manager.explorer.read'],
        },
        postal_code: {
          actions: ['plugins::content-manager.explorer.update'],
        },
      },
    },
  },
  pluginsAndSettingsPermissions: [
    {
      action: 'plugins::upload.assets.update',
      conditions: ['admin::is-creator'],
      fields: null,
      subject: null,
    },
    {
      action: 'plugins::upload.assets.create',
      conditions: [],
      fields: null,
      subject: null,
    },
  ],
};

export default data;
