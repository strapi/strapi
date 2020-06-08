'use strict';
const _ = require('lodash');
const actionProviderService = require('../action-provider');

describe('Action Provider Service', () => {
  const createdActions = [];

  beforeEach(() => {
    global.strapi = {
      plugins: { aPlugin: {} },
    };
  });

  describe('settings', () => {
    test('Can register a settings action', async () => {
      const action = {
        uid: 'marketplace.read',
        displayName: 'Can read',
        pluginName: 'admin',
        section: 'settings',
        category: 'plugins and marketplace',
        subCategory: 'marketplace',
      };

      await actionProviderService.register([action]);
      const createdAction = actionProviderService.get(action.uid, action.pluginName);

      expect(createdAction).toMatchObject({
        ..._.omit(action, ['uid']),
        actionId: 'admin::marketplace.read',
        conditions: [],
      });

      createdActions.push(createdAction);
    });

    test('Can register a settings action without subCategory', async () => {
      const action = {
        uid: 'marketplace.create',
        displayName: 'Can create',
        pluginName: 'admin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      await actionProviderService.register([action]);
      const createdAction = actionProviderService.get(action.uid, action.pluginName);

      expect(createdAction).toMatchObject({
        ..._.omit(action, ['uid']),
        actionId: 'admin::marketplace.create',
        subCategory: 'general',
        conditions: [],
      });
      createdActions.push(createdAction);
    });

    test('Can register a settings action with a pluginName other than "admin"', async () => {
      const action = {
        uid: 'marketplace.update',
        displayName: 'Can update',
        pluginName: 'aPlugin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      await actionProviderService.register([action]);
      const createdAction = actionProviderService.get(action.uid, action.pluginName);

      expect(createdAction).toMatchObject({
        ..._.omit(action, ['uid']),
        actionId: 'plugins::aPlugin.marketplace.update',
        conditions: [],
      });
    });

    test('Cannot register a settings action with a non standard name', async () => {
      const action = {
        uid: 'Marketplace Read',
        displayName: 'Can access to the marketplace',
        pluginName: 'aPlugin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      expect(() => actionProviderService.register([action])).toThrow(
        '[0].uid: The id can only contain lowercase letters, dots and hyphens.'
      );
    });

    test('Cannot register actions with same actionId', async () => {
      global.strapi.stopWithError = jest.fn(() => {});

      const action1 = {
        uid: 'marketplace.delete',
        displayName: 'Can delete',
        pluginName: 'aPlugin',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      const action2 = {
        uid: action1.uid,
        displayName: 'delete',
        pluginName: 'aPlugin',
        section: 'plugins',
      };

      expect(() => actionProviderService.register([action1, action2])).toThrow(
        'Duplicated action id: plugins::aPlugin.marketplace.delete. You may want to change the actions name.'
      );
    });

    test("Cannot register a settings action with a pluginName that doesn't exist", async () => {
      const action = {
        uid: 'marketplace.read',
        displayName: 'Can access to the marketplace',
        pluginName: 'plugin-name-that-doesnt-exist',
        section: 'settings',
        category: 'plugins and marketplace',
      };

      expect(() => actionProviderService.register([action])).toThrow(
        '[0].pluginName is not an existing plugin'
      );
    });

    test('Cannot register a settings action without category', async () => {
      const action = {
        uid: 'marketplace.read',
        displayName: 'Can access to the marketplace',
        pluginName: 'admin',
        section: 'settings',
      };

      expect(() => actionProviderService.register([action])).toThrow(
        '[0].category is a required field'
      );
    });
  });
});
