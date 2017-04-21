/*
 *
 * Edit reducer
 *
 */

import { fromJS } from 'immutable';
import {
  SET_CURRENT_MODEL_NAME,
  LOAD_RECORD,
  LOAD_RECORD_SUCCESS,
  SET_RECORD_ATTRIBUTE,
  EDIT_RECORD,
  EDIT_RECORD_SUCCESS,
  EDIT_RECORD_ERROR,
} from './constants';

const initialState = fromJS({
  currentModelName: null,
  loading: false,
  record: null,
  editing: false,
});

function editReducer(state = initialState, action) {
  switch (action.type) {
    case SET_CURRENT_MODEL_NAME:
      return state
        .set('currentModelName', action.currentModelName);
    case LOAD_RECORD:
      return state
        .set('loading', true)
        .set('model', action.model)
        .set('id', action.id);
    case LOAD_RECORD_SUCCESS:
      return state
        .set('loading', false)
        .set('record', fromJS(action.record));
    case SET_RECORD_ATTRIBUTE:
      return state
        .setIn(['record', action.key], action.value);
    case EDIT_RECORD:
      return state
        .set('editing', true);
    case EDIT_RECORD_SUCCESS:
      return state
        .set('editing', false);
    case EDIT_RECORD_ERROR:
      return state
        .set('editing', false);
    default:
      return state;
  }
}

export default editReducer;
