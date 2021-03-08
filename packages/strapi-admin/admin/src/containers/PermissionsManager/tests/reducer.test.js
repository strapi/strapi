import produce from 'immer';
import {
  getUserPermissions,
  getUserPermissionsError,
  getUserPermissionsSucceeded,
} from '../actions';
import permissionsManagerReducer from '../reducer';

describe('permissionsManagerReducer', () => {
  let state;

  beforeEach(() => {
    state = {
      isLoading: true,
      userPermissions: [],
      collectionTypesRelatedPermissions: {},
    };
  });

  it('returns the initial state', () => {
    const expected = state;

    expect(permissionsManagerReducer(undefined, {})).toEqual(expected);
  });

  it('should handle the getUserPermissions action correctly', () => {
    state.userPermissions = ['test'];
    state.collectionTypesRelatedPermissions = null;

    const expected = produce(state, draft => {
      draft.isLoading = true;
      draft.userPermissions = [];
      draft.collectionTypesRelatedPermissions = {};
    });

    expect(permissionsManagerReducer(state, getUserPermissions())).toEqual(expected);
  });

  it('should handle the getUserPermissionsError action correctly', () => {
    const error = 'Error';
    const expected = produce(state, draft => {
      draft.isLoading = false;
      draft.error = error;
    });

    expect(permissionsManagerReducer(state, getUserPermissionsError(error))).toEqual(expected);
  });

  it('should handle the getUserPermissionsSucceeded action correctly', () => {
    const data = [
      {
        action: 'create',
        subject: 'address',
        properties: {
          fields: ['f1'],
        },
        conditions: [],
      },
      {
        action: 'create',
        subject: 'address',
        properties: {
          fields: ['f2'],
        },
        conditions: [],
      },
      {
        action: 'tes',
        subject: null,
        properties: {},
        conditions: [],
      },
    ];
    const expected = produce(state, draft => {
      draft.isLoading = false;
      draft.userPermissions = data;
      draft.collectionTypesRelatedPermissions = {
        address: {
          create: [
            {
              action: 'create',
              subject: 'address',
              properties: {
                fields: ['f1'],
              },
              conditions: [],
            },
            {
              action: 'create',
              subject: 'address',
              properties: {
                fields: ['f2'],
              },
              conditions: [],
            },
          ],
        },
      };
    });

    expect(permissionsManagerReducer(state, getUserPermissionsSucceeded(data))).toEqual(expected);
  });
});
