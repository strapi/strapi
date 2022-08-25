'use strict';

const createContext = require('../../../../../../test/helpers/create-context');
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
            checkMany: jest.fn((ability) => (permissions) => {
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

      expect.assertions(1);

      try {
        await permissionController.check(ctx);
      } catch (e) {
        expect(e).toMatchObject({
          name: 'ValidationError',
          message: 'permissions[0].action must be a `string` type, but the final value was: `{}`.',
          details: {
            errors: [
              {
                path: ['permissions', '0', 'action'],
                message:
                  'permissions[0].action must be a `string` type, but the final value was: `{}`.',
                name: 'ValidationError',
              },
            ],
          },
        });
      }
    });

    test('Invalid Permission Shape (missing required action)', async () => {
      const ctx = createContext(
        { body: { permissions: [localTestData.permissions.invalid[1]] } },
        { state: { userAbility: localTestData.ability }, badRequest: localTestData.badRequest }
      );

      expect.assertions(1);

      try {
        await permissionController.check(ctx);
      } catch (e) {
        expect(e).toMatchObject({
          name: 'ValidationError',
          message: 'permissions[0].action is a required field',
          details: {
            errors: [
              {
                path: ['permissions', '0', 'action'],
                message: 'permissions[0].action is a required field',
                name: 'ValidationError',
              },
            ],
          },
        });
      }
    });

    test('Invalid Permission Shape (bad type for subject)', async () => {
      const ctx = createContext(
        { body: { permissions: [localTestData.permissions.invalid[2]] } },
        { state: { userAbility: localTestData.ability }, badRequest: localTestData.badRequest }
      );

      expect.assertions(1);

      try {
        await permissionController.check(ctx);
      } catch (e) {
        expect(e).toMatchObject({
          name: 'ValidationError',
          message: 'permissions[0].subject must be a `string` type, but the final value was: `{}`.',
          details: {
            errors: [
              {
                path: ['permissions', '0', 'subject'],
                message:
                  'permissions[0].subject must be a `string` type, but the final value was: `{}`.',
                name: 'ValidationError',
              },
            ],
          },
        });
      }
    });

    test('Invalid Permission Shape (bad type for field)', async () => {
      const ctx = createContext(
        { body: { permissions: [localTestData.permissions.invalid[3]] } },
        { state: { userAbility: localTestData.ability }, badRequest: localTestData.badRequest }
      );

      expect.assertions(1);

      try {
        await permissionController.check(ctx);
      } catch (e) {
        expect(e).toMatchObject({
          name: 'ValidationError',
          message: 'permissions[0].field must be a `string` type, but the final value was: `{}`.',
          details: {
            errors: [
              {
                path: ['permissions', '0', 'field'],
                message:
                  'permissions[0].field must be a `string` type, but the final value was: `{}`.',
                name: 'ValidationError',
              },
            ],
          },
        });
      }
    });

    test('Invalid Permission Shape (unrecognized foo param)', async () => {
      const ctx = createContext(
        { body: { permissions: [localTestData.permissions.invalid[4]] } },
        { state: { userAbility: localTestData.ability }, badRequest: localTestData.badRequest }
      );

      expect.assertions(1);

      try {
        await permissionController.check(ctx);
      } catch (e) {
        expect(e).toMatchObject({
          name: 'ValidationError',
          message: 'permissions[0] field has unspecified keys: foo',
          details: {
            errors: [
              {
                path: ['permissions', '0'],
                message: 'permissions[0] field has unspecified keys: foo',
                name: 'ValidationError',
              },
            ],
          },
        });
      }
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

  describe('Content API permissions', () => {
    const actionsMap = {
      'api::address': {
        controllers: {
          address: ['find', 'findOne'],
        },
      },
      'api::category': {
        controllers: {
          category: ['find', 'findOne', 'create', 'update', 'delete', 'createLocalization'],
        },
      },
    };

    test('return API tokens layout successfully', async () => {
      const getActionsMap = jest.fn().mockResolvedValue(actionsMap);
      const send = jest.fn();
      const ctx = createContext({}, { send });

      global.strapi = {
        contentAPI: {
          permissions: {
            getActionsMap,
          },
        },
      };

      await permissionController.getContentApiPermissions(ctx);

      expect(getActionsMap).toHaveBeenCalled();
      expect(send).toHaveBeenCalledWith({ data: actionsMap });
    });
  });
});
