/**
 *
 * AdminPage reducer
 *
 */

import { fromJS, Map } from 'immutable';

import { GET_GA_STATUS_SUCCEEDED, GET_LAYOUT_SUCCEEDED } from './constants';

const initialState = fromJS({
  allowGa: true,
  layout: Map({}),
});

function adminPageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_GA_STATUS_SUCCEEDED:
      return state.update('allowGa', () => action.allowGa);
    case GET_LAYOUT_SUCCEEDED:
      return state.update('layout', () => Map(action.layout));
    default:
      return state;
  }
}

export default adminPageReducer;
