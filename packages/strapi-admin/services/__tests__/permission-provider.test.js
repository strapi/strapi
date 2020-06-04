'use strict';

const permissionProviderService = require('../permission-provider');

describe('Permission Provider Service', () => {
  let permissionProvider;

  beforeEach(() => {
    global.strapi = {
      stopWithError: jest.fn(() => {}),
      plugins: { aPlugin: {} },
    };
    permissionProvider = permissionProviderService.createPermissionProvider();
  });

  describe('settings', () => {
    test('Can register a settings permission', async () => {
      const permission = {
        name: 'marketplace.read',
        displayName: 'Can access to the marketplace',
        pluginName: 'admin',
        section: 'settings',
        category: 'plugins and marketplace',
        subCategory: 'marketplace',
      };

      await permissionProvider.register([permission]);
      const permissions = permissionProvider.getAll();

      expect(permissions).toMatchObject([
        {
          ...permission,
          permissionId: 'admin::marketplace.read',
          conditions: [],
        },
      ]);
    });

    test('Can register a settings permission without subCategory', async () => {
      const permission = {
        name: 'marketplace.read',
        displayName: 'Can access to the marketplace',
        pluginName: 'admin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      await permissionProvider.register([permission]);
      const permissions = permissionProvider.getAll();

      expect(permissions).toMatchObject([
        {
          ...permission,
          permissionId: 'admin::marketplace.read',
          subCategory: 'general',
          conditions: [],
        },
      ]);
    });

    test('Can register a settings permission with a pluginName other than "admin"', async () => {
      const permission = {
        name: 'marketplace.read',
        displayName: 'Can access to the marketplace',
        pluginName: 'aPlugin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      await permissionProvider.register([permission]);
      const permissions = permissionProvider.getAll();

      expect(permissions).toMatchObject([
        {
          ...permission,
          permissionId: 'plugins::aPlugin.marketplace.read',
          conditions: [],
        },
      ]);
    });

    test('Can register a settings permission with a non standard name', async () => {
      const permission = {
        name: 'Marketplace Read',
        displayName: 'Can access to the marketplace',
        pluginName: 'aPlugin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      await permissionProvider.register([permission]);
      const permissions = permissionProvider.getAll();

      expect(permissions).toMatchObject([
        {
          ...permission,
          permissionId: 'plugins::aPlugin.marketplace.read',
          conditions: [],
        },
      ]);
    });

    test('Cannot register permissions with same permssionId', async () => {
      const permission1 = {
        name: 'marketplace.read',
        displayName: 'Can access to the marketplace',
        pluginName: 'aPlugin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      const permission2 = {
        name: permission1.name,
        displayName: 'read',
        pluginName: 'aPlugin',
        section: 'plugins',
      };

      await permissionProvider.register([permission1, permission2]);

      expect(global.strapi.stopWithError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message:
            'Duplicated permission keys: plugins::aPlugin.marketplace.read. You may want to change the permissions name.',
        })
      );
    });

    test("Cannot register a settings permission with a pluginName that doesn't exist", async () => {
      const permission = {
        name: 'marketplace.read',
        displayName: 'Can access to the marketplace',
        pluginName: 'plugin-name-that-doesnt-exist',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      expect(() => permissionProvider.register([permission])).toThrow(
        '[0].pluginName is not an existing plugin'
      );
    });

    test('Cannot register a settings permission without category', async () => {
      const permission = {
        name: 'marketplace.read',
        displayName: 'Can access to the marketplace',
        pluginName: 'admin',
        section: 'settings',
      };

      expect(() => permissionProvider.register([permission])).toThrow(
        '[0].category is a required field'
      );
    });
  });
});
