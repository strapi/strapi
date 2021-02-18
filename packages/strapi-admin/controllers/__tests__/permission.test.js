'use strict';

const createContext = require('../../../../test/helpers/create-context');
const permissionController = require('../permission');

describe('Permission Controller', () => {
  const localTestData = {
    permissions: {
      valid: [
        { action: 'read', subject: 'article', field: 'title' },
        { action: 'read', subject: 'article' },
        { action: 'read' },
      ],
      invalid: [
        { action: {}, subject: '', field: '' },
        { subject: 'article', field: 'title' },
        { action: 'read', subject: {}, field: 'title' },
        { action: 'read', subject: 'article', field: {} },
        { action: 'read', subject: 'article', field: 'title', foo: 'bar' },
      ],
    },
    ability: {
      can: jest.fn(() => true),
    },
    badRequest: jest.fn(),
  };

  global.strapi = {
    admin: {
      services: {
        permission: {
          engine: {
            checkMany: jest.fn(ability => permissions => {
              return permissions.map(({ action, subject, field }) =>
                ability.can(action, subject, field)
              );
            }),
          },
        },
      },
    },
  };

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('Check Many Permissions', () => {
    test('Invalid Permission Shape (bad type for action)', async () => {
      const ctx = createContext(
        { body: { permissions: [localTestData.permissions.invalid[0]] } },
        { state: { userAbility: localTestData.ability }, badRequest: localTestData.badRequest }
      );

      await permissionController.check(ctx);

      expect(localTestData.badRequest).toHaveBeenCalled();
    });

    test('Invalid Permission Shape (missing required action)', async () => {
      const ctx = createContext(
        { body: { permissions: [localTestData.permissions.invalid[1]] } },
        { state: { userAbility: localTestData.ability }, badRequest: localTestData.badRequest }
      );

      await permissionController.check(ctx);

      expect(localTestData.badRequest).toHaveBeenCalled();
    });

    test('Invalid Permission Shape (bad type for subject)', async () => {
      const ctx = createContext(
        { body: { permissions: [localTestData.permissions.invalid[2]] } },
        { state: { userAbility: localTestData.ability }, badRequest: localTestData.badRequest }
      );

      await permissionController.check(ctx);

      expect(localTestData.badRequest).toHaveBeenCalled();
    });

    test('Invalid Permission Shape (bad type for field)', async () => {
      const ctx = createContext(
        { body: { permissions: [localTestData.permissions.invalid[3]] } },
        { state: { userAbility: localTestData.ability }, badRequest: localTestData.badRequest }
      );

      await permissionController.check(ctx);

      expect(localTestData.badRequest).toHaveBeenCalled();
    });

    test('Invalid Permission Shape (unrecognized foo param)', async () => {
      const ctx = createContext(
        { body: { permissions: [localTestData.permissions.invalid[4]] } },
        { state: { userAbility: localTestData.ability }, badRequest: localTestData.badRequest }
      );

      await permissionController.check(ctx);

      expect(localTestData.badRequest).toHaveBeenCalled();
    });

    test('Check Many Permissions', async () => {
      const ctx = createContext(
        { body: { permissions: localTestData.permissions.valid } },
        { state: { userAbility: localTestData.ability } }
      );

      await permissionController.check(ctx);

      expect(localTestData.ability.can).toHaveBeenCalled();
      expect(strapi.admin.services.permission.engine.checkMany).toHaveBeenCalled();
      expect(ctx.body.data).toHaveLength(localTestData.permissions.valid.length);
    });
  });
});
