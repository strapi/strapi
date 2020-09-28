import formatPermissionsFromApi from '../formatPermissionsFromApi';

const data = [
  {
    action: 'plugins::content-manager.explorer.create',
    conditions: [],
    fields: ['email', 'firstname', 'lastname', 'roles'],
    id: 1,
    role: 11,
    subject: 'plugins::users-permissions.user',
  },
  {
    action: 'plugins::content-manager.explorer.update',
    conditions: [],
    fields: ['email', 'firstname', 'lastname'],
    id: 2,
    role: 11,
    subject: 'plugins::users-permissions.user',
  },
  {
    action: 'plugins::content-manager.explorer.read',
    conditions: [],
    fields: ['name', 'addresses'],
    id: 3,
    role: 12,
    subject: 'application::category.category',
  },
  {
    action: 'plugins::content-manager.explorer.delete',
    conditions: [],
    fields: [],
    id: 4,
    role: 12,
    subject: 'application::category.category',
  },
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
];

describe('ADMIN | utils | formatPermissionsFromApi', () => {
  it('should format api permissions data', () => {
    const formattedPermissions = formatPermissionsFromApi(data);
    const expected = {
      contentTypesPermissions: {
        'plugins::users-permissions.user': {
          conditions: {
            'plugins::content-manager.explorer.create': [],
            'plugins::content-manager.explorer.update': [],
          },
          contentTypeActions: {
            'plugins::content-manager.explorer.create': true,
            'plugins::content-manager.explorer.update': true,
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
            roles: {
              actions: ['plugins::content-manager.explorer.create'],
            },
          },
        },
        'application::category.category': {
          conditions: {
            'plugins::content-manager.explorer.delete': [],
            'plugins::content-manager.explorer.read': [],
          },
          contentTypeActions: {
            'plugins::content-manager.explorer.read': true,
            'plugins::content-manager.explorer.delete': true,
          },
          attributes: {
            name: {
              actions: ['plugins::content-manager.explorer.read'],
            },
            addresses: {
              actions: ['plugins::content-manager.explorer.read'],
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

    expect(formattedPermissions).toEqual(expected);
  });
});
