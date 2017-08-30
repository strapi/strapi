/*
 *
 * Edit reducer
 *
 */

import { fromJS } from 'immutable';

import {
  SET_INITIAL_STATE,
  SET_CURRENT_MODEL_NAME,
  SET_IS_CREATING,
  LOAD_RECORD,
  LOAD_RECORD_SUCCESS,
  SET_RECORD_ATTRIBUTE,
  EDIT_RECORD,
  EDIT_RECORD_SUCCESS,
  EDIT_RECORD_ERROR,
  DELETE_RECORD,
  DELETE_RECORD_SUCCESS,
  DELETE_RECORD_ERROR,
} from './constants';

const initialState = fromJS({
  currentModelName: '',
  loading: false,
  record: false,
  editing: false,
  deleting: false,
  isCreating: false,
});

function editReducer(state = initialState, action) {
  switch (action.type) {
    case SET_INITIAL_STATE:
      return initialState;
    case SET_CURRENT_MODEL_NAME:
      return state.set('currentModelName', action.currentModelName);
    case SET_IS_CREATING:
      return state
        .set('isCreating', true)
        .set('loading', false)
        .set('record', fromJS({}));
    case LOAD_RECORD:
      return state
        .set('loading', true)
        .set('model', action.model)
        .set('id', action.id);
    case LOAD_RECORD_SUCCESS:
      return state.set('loading', false).set('record', fromJS(action.record));
    case SET_RECORD_ATTRIBUTE:
      return state.setIn(['record', action.key], action.value);
    case EDIT_RECORD:
      return state.set('editing', true);
    case EDIT_RECORD_SUCCESS:
      return state.set('editing', false);
    case EDIT_RECORD_ERROR:
      return state.set('editing', false);
    case DELETE_RECORD:
      return state.set('deleting', true);
    case DELETE_RECORD_SUCCESS:
      return state.set('deleting', false);
    case DELETE_RECORD_ERROR:
      return state.set('deleting', false);
    default:
      return state;
  }
}

export default editReducer;
