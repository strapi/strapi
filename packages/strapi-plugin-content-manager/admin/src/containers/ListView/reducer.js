/**
 *
 * listView reducer
 */

import { fromJS, List } from 'immutable';
import { GET_DATA_SUCCEEDED, RESET_PROPS } from './constants';

export const initialState = fromJS({
  count: 0,
  data: List([]),
  isLoading: true,
});

function listViewReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DATA_SUCCEEDED:
      return state
        .update('count', () => action.count)
        .update('data', () => List(action.data))
        .update('isLoading', () => false);
    case RESET_PROPS:
      return initialState;
    default:
      return state;
  }
}

export default listViewReducer;
