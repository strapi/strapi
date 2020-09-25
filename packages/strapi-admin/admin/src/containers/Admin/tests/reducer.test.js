import produce from 'immer';
import {
  setAppError,
  getUserPermissions,
  getUserPermissionsError,
  getUserPermissionsSucceeded,
} from '../actions';
import adminReducer from '../reducer';

describe('adminReducer', () => {
  let state;

  beforeEach(() => {
    state = {
      appError: false,
      isLoading: true,
      userPermissions: [],
    };
  });

  it('returns the initial state', () => {
    const expected = state;

    expect(adminReducer(undefined, {})).toEqual(expected);
  });

  it('should handle the setAppError action correctly', () => {
    const expected = produce(state, draft => {
      draft.appError = true;
    });

    expect(adminReducer(state, setAppError())).toEqual(expected);
  });

  it('should handle the getUserPermissions action correctly', () => {
    const expected = produce(state, draft => {
      draft.isLoading = true;
    });

    expect(adminReducer(state, getUserPermissions())).toEqual(expected);
  });

  it('should handle the getUserPermissionsError action correctly', () => {
    const error = 'Error';
    const expected = produce(state, draft => {
      draft.isLoading = false;
      draft.error = error;
    });

    expect(adminReducer(state, getUserPermissionsError(error))).toEqual(expected);
  });

  it('should handle the getUserPermissionsSucceeded action correctly', () => {
    const data = ['permission 1', 'permission 2'];
    const expected = produce(state, draft => {
      draft.isLoading = false;
      draft.userPermissions = data;
    });

    expect(adminReducer(state, getUserPermissionsSucceeded(data))).toEqual(expected);
  });
});
