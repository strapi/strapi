'use strict';
const _ = require('lodash');
const permissionProviderService = require('../permission-provider');

describe('Permission Provider Service', () => {
  const createdPermissions = [];

  beforeEach(() => {
    global.strapi = {
      plugins: { aPlugin: {} },
    };
  });

  describe('settings', () => {
    test('Can register a settings permission', async () => {
      const permission = {
        uid: 'marketplace.read',
        displayName: 'Can read',
        pluginName: 'admin',
        section: 'settings',
        category: 'plugins and marketplace',
        subCategory: 'marketplace',
      };

      await permissionProviderService.register([permission]);
      const createdPermission = permissionProviderService.get(
        permission.pluginName,
        permission.uid
      );

      expect(createdPermission).toMatchObject({
        ..._.omit(permission, ['uid']),
        permissionId: 'admin::marketplace.read',
        conditions: [],
      });

      createdPermissions.push(createdPermission);
    });

    test('Can register a settings permission without subCategory', async () => {
      const permission = {
        uid: 'marketplace.create',
        displayName: 'Can create',
        pluginName: 'admin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      await permissionProviderService.register([permission]);
      const createdPermission = permissionProviderService.get(
        permission.pluginName,
        permission.uid
      );

      expect(createdPermission).toMatchObject({
        ..._.omit(permission, ['uid']),
        permissionId: 'admin::marketplace.create',
        subCategory: 'general',
        conditions: [],
      });
      createdPermissions.push(createdPermission);
    });

    test('Can register a settings permission with a pluginName other than "admin"', async () => {
      const permission = {
        uid: 'marketplace.update',
        displayName: 'Can update',
        pluginName: 'aPlugin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      await permissionProviderService.register([permission]);
      const createdPermission = permissionProviderService.get(
        permission.pluginName,
        permission.uid
      );

      expect(createdPermission).toMatchObject({
        ..._.omit(permission, ['uid']),
        permissionId: 'plugins::aPlugin.marketplace.update',
        conditions: [],
      });
    });

    test('Cannot register a settings permission with a non standard name', async () => {
      const permission = {
        uid: 'Marketplace Read',
        displayName: 'Can access to the marketplace',
        pluginName: 'aPlugin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      expect(() => permissionProviderService.register([permission])).toThrow(
        '[0].uid: The id can only contain lowercase letters, dots and hyphens.'
      );
    });

    test('Cannot register permissions with same permissionId', async () => {
      global.strapi.stopWithError = jest.fn(() => {});

      const permission1 = {
        uid: 'marketplace.delete',
        displayName: 'Can delete',
        pluginName: 'aPlugin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      const permission2 = {
        uid: permission1.uid,
        displayName: 'delete',
        pluginName: 'aPlugin',
        section: 'plugins',
      };

      await permissionProviderService.register([permission1, permission2]);

      expect(global.strapi.stopWithError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message:
            'Duplicated permission keys: plugins::aPlugin.marketplace.delete. You may want to change the permissions name.',
        })
      );
    });

    test("Cannot register a settings permission with a pluginName that doesn't exist", async () => {
      const permission = {
        uid: 'marketplace.read',
        displayName: 'Can access to the marketplace',
        pluginName: 'plugin-name-that-doesnt-exist',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      expect(() => permissionProviderService.register([permission])).toThrow(
        '[0].pluginName is not an existing plugin'
      );
    });

    test('Cannot register a settings permission without category', async () => {
      const permission = {
        uid: 'marketplace.read',
        displayName: 'Can access to the marketplace',
        pluginName: 'admin',
        section: 'settings',
      };

      expect(() => permissionProviderService.register([permission])).toThrow(
        '[0].category is a required field'
      );
    });
  });
});
