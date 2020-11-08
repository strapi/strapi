/*
 *
 * Admin reducer
 *
 */

import produce from 'immer';

import {
  GET_USER_PERMISSIONS,
  GET_USER_PERMISSIONS_ERROR,
  GET_USER_PERMISSIONS_SUCCEEDED,
  SET_APP_ERROR,
} from './constants';

const initialState = {
  appError: false,
  isLoading: true,
  userPermissions: [],
};

const reducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case GET_USER_PERMISSIONS: {
        draftState.isLoading = true;
        break;
      }

      case GET_USER_PERMISSIONS_ERROR: {
        draftState.error = action.error;
        draftState.isLoading = false;
        break;
      }
      case GET_USER_PERMISSIONS_SUCCEEDED: {
        draftState.isLoading = false;
        draftState.userPermissions = action.data;
        break;
      }
      case SET_APP_ERROR: {
        draftState.appError = true;
        break;
      }
      default:
        return state;
    }
  });

export default reducer;
export { initialState };
