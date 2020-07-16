'use strict';
const _ = require('lodash');
const actionProviderService = require('../permission/action-provider');

describe('Action Provider Service', () => {
  const createdActions = [];

  beforeEach(() => {
    global.strapi = {
      plugins: { aPlugin: {} },
    };
  });

  describe('settings', () => {
    const readAction = {
      uid: 'marketplace.read',
      displayName: 'Can read',
      pluginName: 'admin',
      section: 'settings',
      category: 'plugins and marketplace',
      subCategory: 'marketplace',
    };

    const createAction = {
      uid: 'marketplace.create',
      displayName: 'Can create',
      pluginName: 'admin',
      section: 'settings',
      category: 'plugins and marketplace',
    };

    test('Can register a settings action', async () => {
      await actionProviderService.register([readAction]);
      const createdAction = actionProviderService.get(readAction.uid, readAction.pluginName);

      expect(createdAction).toMatchObject({
        ..._.omit(readAction, ['uid']),
        actionId: 'admin::marketplace.read',
      });

      createdActions.push(createdAction);
    });

    test('Can register a settings action without subCategory', async () => {
      await actionProviderService.register([createAction]);
      const createdAction = actionProviderService.get(createAction.uid, createAction.pluginName);

      expect(createdAction).toMatchObject({
        ..._.omit(createAction, ['uid']),
        actionId: 'admin::marketplace.create',
        subCategory: 'general',
      });
      createdActions.push(createdAction);
    });

    test('Can get all registered entries (array)', () => {
      expect(actionProviderService.getAll()).toHaveLength(2);
    });

    test('Can get all registered entries (map)', () => {
      expect(actionProviderService.getAllByMap().size).toBe(2);
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
      });
    });

    test('Cannot register a settings action with a non standard name', async () => {
      const action = {
        uid: 'Marketplace Read',
        displayName: 'Access the marketplace',
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
        displayName: 'Access the marketplace',
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
        displayName: 'Access the marketplace',
        pluginName: 'admin',
        section: 'settings',
      };

      expect(() => actionProviderService.register([action])).toThrow(
        '[0].category is a required field'
      );
    });

    test('Cannot register an action outside of the bootstrap function', async () => {
      global.strapi = {
        isLoaded: true,
      };

      expect(() => actionProviderService.register([])).toThrow(
        `You can't register new actions outside of the bootstrap function.`
      );
    });
  });
});
