/*
 *
 * RBACProvider reducer
 * The goal of this reducer is to provide
 * the plugins with an access to the user's permissions
 * in our middleware system
 *
 */

import produce from 'immer';

import { RESET_STORE, SET_PERMISSIONS } from './constants';

const initialState = {
  allPermissions: null,
  collectionTypesRelatedPermissions: {},
};

const reducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case SET_PERMISSIONS: {
        draftState.allPermissions = action.permissions;
        draftState.collectionTypesRelatedPermissions = action.permissions
          .filter((perm) => perm.subject)
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
      case RESET_STORE: {
        return initialState;
      }
      default:
        return state;
    }
  });

export default reducer;
export { initialState };
