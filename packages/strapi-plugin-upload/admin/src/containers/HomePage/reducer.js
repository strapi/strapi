/*
 *
 * HomePage reducer
 *
 */

import { fromJS } from 'immutable';

import { ON_SEARCH } from './constants';

const initialState = fromJS({
  search: '',
});

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case ON_SEARCH:
      return state.update('search', () => action.value);
    default:
      return state;
  }
}

export default homePageReducer;
