import { permissions } from '@strapi/admin-test-utils/lib/fixtures/fixtures';

import { setPermissions, resetStore } from '../actions';
import rbacProviderReducer, { initialState } from '../reducer';

describe('rbacProviderReducer', () => {
  let state;

  beforeEach(() => {
    state = {
      allPermissions: null,
      collectionTypesRelatedPermissions: {},
    };
  });

  it('returns the initial state', () => {
    const expected = state;

    expect(rbacProviderReducer(undefined, {})).toEqual(expected);
  });

  describe('resetStore', () => {
    it('should reset the state to its initial value', () => {
      state.allPermissions = true;
      state.collectionTypesRelatedPermissions = true;

      expect(rbacProviderReducer(state, resetStore())).toEqual(initialState);
    });
  });

  describe('setPermissions', () => {
    it('should set the allPermissions value correctly', () => {
      const permissions = [{ action: 'test', subject: null }];
      const expected = { ...state, allPermissions: permissions };

      expect(rbacProviderReducer(state, setPermissions(permissions))).toEqual(expected);
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
        rbacProviderReducer(state, setPermissions(permissions)).collectionTypesRelatedPermissions
      ).toEqual(expected);
    });
  });
});
