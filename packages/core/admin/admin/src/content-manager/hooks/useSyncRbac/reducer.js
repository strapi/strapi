/**
 *
 * RBACManager reducer
 */

import produce from 'immer';
import { SET_PERMISSIONS, RESET_PERMISSIONS } from './constants';

export const initialState = {
  permissions: null,
};

const rbacManagerReducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case SET_PERMISSIONS: {
        draftState.permissions = Object.entries(action.permissions).reduce((acc, current) => {
          return [...acc, ...current[1]];
        }, []);
        break;
      }
      case RESET_PERMISSIONS: {
        draftState.permissions = null;
        break;
      }
      default:
        return draftState;
    }
  });

export default rbacManagerReducer;
