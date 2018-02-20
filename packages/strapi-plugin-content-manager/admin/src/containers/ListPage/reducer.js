/**
 *
 * ListPage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';

// ListPage constants
import {
  CHANGE_PARAMS,
  DELETE_DATA_SUCCESS,
  GET_DATA_SUCCEEDED,
  SET_PARAMS,
} from './constants';

const initialState = fromJS({
  count: 0,
  params: Map({
    limit: 10,
    page: 1,
    sort: '',
  }),
  records: List([]),
});

function listPageReducer(state = initialState, action) {
  switch (action.type) {
    case DELETE_DATA_SUCCESS:
      return state.update('records', (list) => (
        list.filter(o => {
          if (o._id) {
            return o._id !== action.id;
          }

          return o.id !== action.id;
        })
      ));
    case CHANGE_PARAMS:
      return state.updateIn(action.keys, () => action.value);
    case GET_DATA_SUCCEEDED:
      return state
        .update('count', () => action.data[0].count)
        .update('records', () => List(action.data[1]));
    case SET_PARAMS:
      return state.update('params', () => Map(action.params));
    default:
      return state;
  }
}

export default listPageReducer;
