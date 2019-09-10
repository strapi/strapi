/*
 *
 * Admin reducer
 *
 */

import { fromJS } from 'immutable';
import { SET_APP_ERROR } from './constants';

const initialState = fromJS({
  appError: false,
});

function adminReducer(state = initialState, action) {
  switch (action.type) {
    case SET_APP_ERROR:
      return state.update('appError', () => true);
    default:
      return state;
  }
}

export default adminReducer;
