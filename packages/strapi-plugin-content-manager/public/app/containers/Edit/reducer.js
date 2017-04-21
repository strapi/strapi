/*
 *
 * Edit reducer
 *
 */

import { fromJS } from 'immutable';
import {
  SET_CURRENT_MODEL,
  LOAD_RECORD,
  LOADED_RECORD
} from './constants';

const initialState = fromJS({
  currentModel: null,
  loading: false,
  record: null,
});

function editReducer(state = initialState, action) {
  switch (action.type) {
    case SET_CURRENT_MODEL:
      return state
        .set('currentModel', action.model);
    case LOAD_RECORD:
      return state
        .set('loading', true)
        .set('model', action.model)
        .set('id', action.id);
    case LOADED_RECORD:
      return state
        .set('loading', false)
        .set('record', action.record);
    default:
      return state;
  }
}

export default editReducer;
