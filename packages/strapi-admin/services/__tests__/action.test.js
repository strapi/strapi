'use strict';

const { getAllowedActionsForRole } = require('../action');
const { AUTHOR_CODE, PUBLISH_ACTION } = require('../constants');

const fixtures = [
  {
    actionId: 'test.action',
  },
  {
    actionId: PUBLISH_ACTION,
  },
  {
    actionId: 'plugins::test.action',
  },
];

describe('Action', () => {
  describe('getAllowedActionsForRole', () => {
    test('returns every action if role is not provided', async () => {
      global.strapi = {
        admin: {
          services: {
            permission: {
              actionProvider: {
                values() {
                  return fixtures;
                },
              },
            },
          },
        },
      };

      const actions = await getAllowedActionsForRole();
      expect(actions.length).toBe(fixtures.length);
      expect(actions).toEqual(expect.arrayContaining(fixtures));
    });

    test('returns every action if role is not the author role', async () => {
      const findOneRoleMock = jest.fn(() => ({ code: 'custom-code ' }));
      const roleId = 1;

      global.strapi = {
        admin: {
          services: {
            role: {
              findOne: findOneRoleMock,
            },
            permission: {
              actionProvider: {
                values() {
                  return fixtures;
                },
              },
            },
          },
        },
      };

      const actions = await getAllowedActionsForRole(roleId);

      expect(findOneRoleMock).toHaveBeenCalledWith({ id: roleId });
      expect(actions.length).toBe(fixtures.length);
      expect(actions).toEqual(expect.arrayContaining(fixtures));
    });

    test('excludes publish action for author role', async () => {
      const findOneRoleMock = jest.fn(() => ({ code: AUTHOR_CODE }));
      const roleId = 1;

      global.strapi = {
        admin: {
          services: {
            role: {
              findOne: findOneRoleMock,
            },
            permission: {
              actionProvider: {
                values() {
                  return fixtures;
                },
              },
            },
          },
        },
      };

      const actions = await getAllowedActionsForRole(roleId);

      expect(findOneRoleMock).toHaveBeenCalledWith({ id: roleId });
      expect(actions.length).toBe(fixtures.length - 1);
      expect(actions).toEqual(
        expect.arrayContaining(fixtures.filter(f => f.actionId !== PUBLISH_ACTION))
      );
    });
  });
});
