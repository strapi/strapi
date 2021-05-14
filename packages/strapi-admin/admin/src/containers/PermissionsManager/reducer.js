/*
 *
 * PermissionsManager reducer
 * The goal of this reducer is to provide
 * the plugins with an access to the user's permissions
 * in our middleware system
 *
 */

import produce from 'immer';

import {
  GET_USER_PERMISSIONS,
  GET_USER_PERMISSIONS_ERROR,
  GET_USER_PERMISSIONS_SUCCEEDED,
} from './constants';

const initialState = {
  isLoading: true,
  userPermissions: [],
  collectionTypesRelatedPermissions: {},
};

const reducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case GET_USER_PERMISSIONS: {
        draftState.isLoading = true;
        draftState.userPermissions = [];
        draftState.collectionTypesRelatedPermissions = {};
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
        draftState.collectionTypesRelatedPermissions = action.data
          .filter(perm => perm.subject)
          .reduce((acc, current) => {
            const { subject, action } = current;

            if (!acc[subject]) {
              acc[subject] = {};
            }

            acc[subject] = acc[subject][action]
              ? { ...acc[subject], [action]: [...acc[subject][action], current] }
              : { ...acc[subject], [action]: [current] };

            return acc;
          }, {});
        break;
      }
      default:
        return state;
    }
  });

export default reducer;
export { initialState };
