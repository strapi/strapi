import formatPermissionsToApi from '../formatPermissionsToApi';
import data from './data';

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
        action: 'plugins::content-manager.explorer.read',
        conditions: ['is_someone', 'is_someone_else'],
        fields: ['name', 'addresses'],
        subject: 'application::category.category',
      },
      {
        action: 'plugins::content-manager.explorer.delete',
        conditions: ['is_creator'],
        fields: null,
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

    expect(formattedPermissions).toEqual(expected);
  });
});
