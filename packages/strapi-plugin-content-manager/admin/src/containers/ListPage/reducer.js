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
  ON_TOGGLE_FILTERS,
} from './constants';

const initialState = fromJS({
  count: 0,
  appliedFilters: List([]),
  params: Map({
    _limit: 10,
    _page: 1,
    _sort: '',
  }),
  records: List([]),
  showFilter: false,
});

function listPageReducer(state = initialState, action) {
  switch (action.type) {
    case DELETE_DATA_SUCCESS:
      return state
        .update('records', (list) => (
          list.filter(obj => {
            if (obj._id) {
              return obj._id !== action.id;
            }

            return obj.id !== parseInt(action.id, 10);
          })
        ))
        .update('count', (v) => v = v - 1);
    case CHANGE_PARAMS:
      return state.updateIn(action.keys, () => action.value);
    case GET_DATA_SUCCEEDED:
      return state
        .update('count', () => action.data[0].count)
        .update('records', () => List(action.data[1]));
    case SET_PARAMS:
      return state.update('params', () => Map(action.params));
    case ON_TOGGLE_FILTERS:
      return state.update('showFilter', v => !v);
    default:
      return state;
  }
}

export default listPageReducer;
