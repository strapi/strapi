const data = {
  'plugins::users-permissions.user': {
    contentTypeActions: {
      'plugins::content-manager.explorer.read': false,
      'plugins::content-manager.explorer.update': true,
      'plugins::content-manager.explorer.create': true,
    },
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
    contentTypeActions: {
      'plugins::content-manager.explorer.delete': true,
      'plugins::content-manager.explorer.read': true,
      'plugins::content-manager.explorer.update': false,
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
};

export default data;
