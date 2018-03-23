/**
 *
 * AdminPage reducer
 *
 */

import { fromJS } from 'immutable';

import { GET_GA_STATUS_SUCCEEDED } from './constants';

const initialState = fromJS({
  allowGa: true,
});

function adminPageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_GA_STATUS_SUCCEEDED:
      return state.update('allowGa', () => action.allowGa);
    default:
      return state;
  }
}

export default adminPageReducer;
