/*
 *
 * Initializer reducer
 *
 */

import { fromJS } from 'immutable';
import { INITIALIZE_SUCCEEDED, UPDATE_HAS_ADMIN } from './constants';

const initialState = fromJS({
  hasAdminUser: false,
  shouldUpdate: false,
});

function initializerReducer(state = initialState, action) {
  switch (action.type) {
    case INITIALIZE_SUCCEEDED:
      return state
        .updateIn(['hasAdminUser'], () => action.data)
        .update('shouldUpdate', v => !v);
    case UPDATE_HAS_ADMIN:
      return state.update('hasAdminUser', () => action.value);
    default:
      return state;
  }
}

export default initializerReducer;
