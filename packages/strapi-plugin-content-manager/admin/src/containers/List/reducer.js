/*
 *
 * List reducer
 *
 */

// Dependencies.
import { fromJS } from 'immutable';

// Constants.

import {
  DELETE_RECORD_SUCCESS,
} from '../Edit/constants';

import {
  SET_CURRENT_MODEL_NAME,
  LOAD_RECORDS,
  LOADED_RECORDS,
  LOAD_COUNT,
  LOADED_COUNT,
  CHANGE_PAGE,
  CHANGE_SORT,
  CHANGE_LIMIT,
  DECREASE_COUNT,
} from './constants';

const initialState = fromJS({
  currentModel: false,
  currentModelName: false,
  currentModelNamePluralized: false,
  loadingRecords: true,
  records: [],
  loadingCount: true,
  count: false,
  currentPage: 1,
  limit: 10,
  sort: 'id',
  initLimit: 10,
  initSort: 'id',
});

function listReducer(state = initialState, action) {
  switch (action.type) {
    case DECREASE_COUNT:
      return state.update('count', (value) => value - 1);
    case SET_CURRENT_MODEL_NAME:
      return state
        .set('currentModelName', action.modelName)
        .set('currentModelNamePluralized', action.modelNamePluralized);
    case LOAD_RECORDS:
      return state.set('loadingRecords', true);
    case LOADED_RECORDS:
      return state.set('loadingRecords', false).set('records', action.records);
    case LOAD_COUNT:
      return state.set('loadingCount', true);
    case LOADED_COUNT:
      return state.set('loadingCount', false).set('count', action.count);
    case CHANGE_PAGE:
      return state.set('currentPage', action.page);
    case CHANGE_SORT:
      return state.set('sort', action.sort);
    case CHANGE_LIMIT:
      return state.set('limit', action.limit);
    case DELETE_RECORD_SUCCESS:
      return state.set('records', state.get('records').filter(o => {
        if (o._id) {
          return o._id !== action.id;
        }

        return o.id !== action.id;
      }));
    default:
      return state;
  }
}

export default listReducer;
