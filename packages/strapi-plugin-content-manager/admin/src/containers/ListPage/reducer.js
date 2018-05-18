/**
 *
 * ListPage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';

// ListPage constants
import {
  ADD_FILTER,
  CHANGE_PARAMS,
  DELETE_DATA_SUCCESS,
  GET_DATA_SUCCEEDED,
  ON_CHANGE,
  ON_TOGGLE_FILTERS,
  REMOVE_FILTER,
  SET_PARAMS,
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
    case ADD_FILTER:
      return state.update('appliedFilters', list => list.push(Map(action.filter)));
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
    case ON_CHANGE:
      return state.updateIn(['appliedFilters', action.index, action.key], () => action.value);
    case ON_TOGGLE_FILTERS:
      return state.update('showFilter', v => !v);
    case REMOVE_FILTER:
      return state.update('appliedFilters', list => list.splice(action.index, 1));
    case SET_PARAMS:
      return state.update('params', () => Map(action.params));
    default:
      return state;
  }
}

export default listPageReducer;
