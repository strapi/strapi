/*
 *
 * HomePage reducer
 *
 */

import { fromJS, List } from 'immutable';

import {
  FETCH_DATA_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  data: List([]),
});

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_DATA_SUCCEEDED:
      return state.set('data', List(action.data));
    default:
      return state;
  }
}

export default homePageReducer;
