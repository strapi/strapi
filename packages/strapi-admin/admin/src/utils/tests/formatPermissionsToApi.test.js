import formatPermissionsToApi from '../formatPermissionsToApi';

const data = {
  'plugins::users-permissions.user': {
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
    roles: {
      actions: ['plugins::content-manager.explorer.create'],
    },
  },
  'application::category.category': {
    contentTypeActions: {
      'plugins::content-manager.explorer.delete': true,
    },
    name: {
      actions: ['plugins::content-manager.explorer.read'],
    },
    addresses: {
      actions: ['plugins::content-manager.explorer.read'],
    },
  },
};

describe('ADMIN | utils | formatPermissionsToApi', () => {
  it('should format permissions to fit the api format', () => {
    const formattedPermissions = formatPermissionsToApi(data);
    const expected = [
      {
        action: 'plugins::content-manager.explorer.create',
        conditions: [],
        fields: ['email', 'firstname', 'lastname', 'roles'],
        subject: 'plugins::users-permissions.user',
      },
      {
        action: 'plugins::content-manager.explorer.update',
        conditions: [],
        fields: ['email', 'firstname', 'lastname'],
        subject: 'plugins::users-permissions.user',
      },
      {
        action: 'plugins::content-manager.explorer.delete',
        conditions: [],
        fields: [],
        subject: 'application::category.category',
      },
      {
        action: 'plugins::content-manager.explorer.read',
        conditions: [],
        fields: ['name', 'addresses'],
        subject: 'application::category.category',
      },
    ];

    expect(formattedPermissions).toEqual(expected);
  });
});
