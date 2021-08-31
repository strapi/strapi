const data = {
  contentTypesPermissions: {
    'plugin::users-permissions.user': {
      conditions: [],
      attributes: {
        email: {
          actions: [
            'plugin::content-manager.explorer.create',
            'plugin::content-manager.explorer.update',
          ],
        },
        firstname: {
          actions: [
            'plugin::content-manager.explorer.create',
            'plugin::content-manager.explorer.update',
          ],
        },
        lastname: {
          actions: [
            'plugin::content-manager.explorer.create',
            'plugin::content-manager.explorer.update',
          ],
        },
        'role.data.name': {
          actions: ['plugin::content-manager.explorer.read'],
        },
        roles: {
          actions: ['plugin::content-manager.explorer.create'],
        },
      },
    },
    'api::category.category': {
      conditions: {
        'plugin::content-manager.explorer.delete': ['is_creator'],
        'plugin::content-manager.explorer.read': ['is_someone', 'is_someone_else'],
      },
      contentTypeActions: {
        'plugin::content-manager.explorer.delete': true,
      },
      attributes: {
        name: {
          actions: ['plugin::content-manager.explorer.read'],
        },
        addresses: {
          actions: ['plugin::content-manager.explorer.read'],
        },
        postal_code: {
          actions: ['plugin::content-manager.explorer.update'],
        },
      },
    },
  },
  pluginsAndSettingsPermissions: [
    {
      action: 'plugin::upload.assets.update',
      conditions: ['admin::is-creator'],
      fields: null,
      subject: null,
    },
    {
      action: 'plugin::upload.assets.create',
      conditions: [],
      fields: null,
      subject: null,
    },
  ],
};

export default data;
