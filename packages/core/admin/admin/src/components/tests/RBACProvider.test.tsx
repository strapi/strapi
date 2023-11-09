import { fixtures } from '@strapi/admin-test-utils';

import {
  Permission,
  RBACReducer,
  RBACState,
  resetStoreAction,
  setPermissionsAction,
} from '../RBACProvider';

describe('RBACReducer', () => {
  let state: RBACState;

  beforeEach(() => {
    state = {
      allPermissions: null,
      collectionTypesRelatedPermissions: {},
    };
  });

  it('returns the initial state', () => {
    const expected = state;

    // @ts-expect-error – testing the default case
    expect(RBACReducer(undefined, {})).toEqual(expected);
  });

  describe('resetStoreAction', () => {
    it('should reset the state to its initial value', () => {
      state.allPermissions = [];
      state.collectionTypesRelatedPermissions = {
        apple: {},
      };

      expect(RBACReducer(state, resetStoreAction())).toMatchInlineSnapshot(`
        {
          "allPermissions": null,
          "collectionTypesRelatedPermissions": {},
        }
      `);
    });
  });

  describe('setPermissionsAction', () => {
    it('should set the allPermissions value correctly', () => {
      const permissions: Permission[] = [
        {
          id: 0,
          action: 'test',
          subject: null,
          conditions: [],
          properties: {},
          actionParameters: {},
        },
      ];
      const expected = { ...state, allPermissions: permissions };

      expect(RBACReducer(state, setPermissionsAction(permissions))).toEqual(expected);
    });

    it('should set the collectionTypesRelatedPermissions correctly', () => {
      const expected = {
        foo: {
          'plugin::content-manager.explorer.create': [
            {
              action: 'plugin::content-manager.explorer.create',
              subject: 'foo',
              properties: {
                fields: ['f1'],
              },
              conditions: [],
            },
            {
              action: 'plugin::content-manager.explorer.create',
              subject: 'foo',
              properties: {
                fields: ['f2'],
              },
              conditions: [],
            },
          ],
          'plugin::content-manager.explorer.read': [
            {
              action: 'plugin::content-manager.explorer.read',
              subject: 'foo',
              properties: {
                fields: ['f1'],
              },
              conditions: [],
            },
          ],
        },
        bar: {
          'plugin::content-manager.explorer.delete': [
            {
              action: 'plugin::content-manager.explorer.delete',
              subject: 'bar',
            },
          ],
          'plugin::content-manager.explorer.update': [
            {
              action: 'plugin::content-manager.explorer.update',
              subject: 'bar',
              properties: {
                fields: ['f1'],
              },
              conditions: [],
            },
          ],
        },
      };

      expect(
        // @ts-expect-error – admin-test-utils permission types are incorrect
        RBACReducer(state, setPermissionsAction(fixtures.permissions.contentManager))
          .collectionTypesRelatedPermissions
      ).toEqual(expected);
    });
  });
});
