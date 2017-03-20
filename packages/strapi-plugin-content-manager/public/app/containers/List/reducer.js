/*
 *
 * List reducer
 *
 */

import { fromJS } from 'immutable';
import {
  SET_CURRENT_MODEL,
  LOAD_RECORDS,
  LOADED_RECORDS
} from './constants';

const initialState = fromJS({
  currentModel: null,
  loading: true,
  records: false,
});

function listReducer(state = initialState, action) {
  switch (action.type) {
    case SET_CURRENT_MODEL:
      return state
        .set('currentModel', action.model);
    case LOAD_RECORDS:
      return state
        .set('loading', true);
    case LOADED_RECORDS:
      return state
        .set('loading', false)
        .set('records', action.records);
    default:
      return state;
  }
}

export default listReducer;
