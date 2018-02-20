/**
 *
 * ListPage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';

// ListPage constants
import {
  GET_DATA_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  count: 0,
  params: Map({
    limit: 10,
    page: 1,
    sort: 'id',
    source: 'content-manager',
  }),
  records: List([]),
});

function listPageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DATA_SUCCEEDED:
      return state
        .update('count', () => action.data[0].count)
        .update('records', () => List(action.data[1]));
    default:
      return state;
  }
}

export default listPageReducer;
