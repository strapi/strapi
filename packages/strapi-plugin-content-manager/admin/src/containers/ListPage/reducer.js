/**
 *
 * ListPage reducer
 *
 */

import { fromJS, Map } from 'immutable';

// ListPage constants
import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  count: 0,
  currentModel: '',
  params: Map({
    currentPage: 1,
  }),
  source: '',
});

function listPageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DATA:
      return state
        .update('currentModel', () => action.currentModel)
        .update('source', () => action.source);
    case GET_DATA_SUCCEEDED:
      return state
        .update('count', () => action.data[0].count);
    default:
      return state;
  }
}

export default listPageReducer;
