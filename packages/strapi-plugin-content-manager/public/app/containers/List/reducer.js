/*
 *
 * List reducer
 *
 */

import { fromJS } from 'immutable';
import {
  SET_CURRENT_MODEL_NAME,
  LOAD_RECORDS,
  LOADED_RECORDS,
  LOAD_COUNT,
  LOADED_COUNT,
  CHANGE_PAGE,
  CHANGE_SORT,
  CHANGE_LIMIT,
} from './constants';

const initialState = fromJS({
  currentModel: null,
  loadingRecords: true,
  records: false,
  loadingCount: true,
  count: false,
  currentPage: 1,
  limit: 10,
  sort: 'id',
});

function listReducer(state = initialState, action) {
  switch (action.type) {
    case SET_CURRENT_MODEL_NAME:
      return state
        .set('currentModelName', action.modelName);
    case LOAD_RECORDS:
      return state
        .set('loadingRecords', true);
    case LOADED_RECORDS:
      return state
        .set('loadingRecords', false)
        .set('records', action.records);
    case LOAD_COUNT:
      return state
        .set('loadingCount', true);
    case LOADED_COUNT:
      return state
        .set('loadingCount', false)
        .set('count', action.count);
    case CHANGE_PAGE:
      return state
        .set('currentPage', action.page);
    case CHANGE_SORT:
      return state
        .set('sort', action.sort);
    case CHANGE_LIMIT:
      return state
        .set('limit', action.limit);
    default:
      return state;
  }
}

export default listReducer;
