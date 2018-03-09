/**
 *
 * AdminPage reducer
 *
 */

import { fromJS } from 'immutable';

const initialState = fromJS({});

function adminPageReducer(state = initialState, action) {
  switch (action.type) {
    default:
      return state;
  }
}

export default adminPageReducer;
