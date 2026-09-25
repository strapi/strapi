'use strict';

const strategy = require('../users-permissions');
const { getService } = require('../../utils');

jest.mock('../../utils', () => ({ getService: jest.fn() }));

describe('users-permissions strategy', () => {
  const previousStrapi = global.strapi;

  afterEach(() => {
    global.strapi = previousStrapi ?? {};
    jest.clearAllMocks();
  });

  it.each([false, true])(
    'passes only the permission to the mapper (authenticated: %s)',
    async (authenticated) => {
      const permissions = [{ action: 'article.find' }, { action: 'article.findOne' }];
      const toContentAPIPermission = jest.fn((permission) => ({ ...permission, subject: null }));
      const ability = { can: jest.fn() };
      const generateAbility = jest.fn().mockResolvedValue(ability);
      const user = { id: 1, confirmed: true, blocked: false, role: { id: 2 } };
      const services = {
        jwt: { getToken: jest.fn().mockResolvedValue(authenticated ? { id: user.id } : null) },
        user: { fetchAuthenticatedUser: jest.fn().mockResolvedValue(user) },
        permission: {
          findRolePermissions: jest.fn().mockResolvedValue(permissions),
          findPublicPermissions: jest.fn().mockResolvedValue(permissions),
          toContentAPIPermission,
        },
      };
      getService.mockImplementation((name) => services[name]);
      global.strapi = {
        store: () => ({ get: jest.fn().mockResolvedValue({ email_confirmation: true }) }),
        contentAPI: { permissions: { engine: { generateAbility } } },
      };
      const ctx = { state: {} };

      const result = await strategy.authenticate(ctx);

      expect(result).toEqual({
        authenticated: true,
        credentials: authenticated ? user : null,
        ability,
      });
      expect(toContentAPIPermission.mock.calls).toEqual(
        permissions.map((permission) => [permission])
      );
      expect(generateAbility).toHaveBeenCalledWith(
        permissions.map((permission) => ({ ...permission, subject: null }))
      );
    }
  );

  it.each([{ scope: 'article.find' }, { scope: ['article.find', 'article.findOne'] }])(
    'checks every requested scope: %s',
    async ({ scope }) => {
      const can = jest.fn().mockReturnValue(true);

      await expect(strategy.verify({ ability: { can } }, { scope })).resolves.toBeUndefined();

      const scopes = Array.isArray(scope) ? scope : [scope];
      expect(can.mock.calls).toEqual(scopes.map((action) => [action]));
    }
  );

  it('rejects a scope array when any action is forbidden', async () => {
    const can = jest.fn((action) => action === 'article.find');

    await expect(
      strategy.verify({ ability: { can } }, { scope: ['article.find', 'article.delete'] })
    ).rejects.toThrow('Forbidden');
  });
});
