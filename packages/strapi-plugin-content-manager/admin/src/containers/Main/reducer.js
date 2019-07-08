/**
 *
 * main reducer
 */

import { fromJS } from 'immutable';

export const initialState = fromJS({
  isLoading: false,
});

function mainReducer(state = initialState, action) {
  switch (action.type) {
    default:
      return state;
  }
}

export default mainReducer;
