/*
 *
 * Edit reducer
 *
 */

import { fromJS, Map, List } from 'immutable';

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
  TOGGLE_NULL,
  CANCEL_CHANGES,
  RESET_EDIT_SUCCESS,
  SET_FORM_VALIDATIONS,
  SET_FORM,
  SET_FORM_ERRORS,
} from './constants';

const initialState = fromJS({
  currentModelName: '',
  loading: false,
  record: false,
  initialRecord: {},
  editing: false,
  deleting: false,
  isCreating: false,
  isRelationComponentNull: false,
  formValidations: List([]),
  formErrors: List([]),
  form: Map({}),
  didCheckErrors: false,
  editSuccess: false,
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
      return state
        .set('loading', false)
        .set('record', fromJS(action.record))
        .set('initialRecord', fromJS(action.record));
    case SET_RECORD_ATTRIBUTE:
      return state
        .setIn(['record', action.key], fromJS(action.value));
    case EDIT_RECORD:
      return state.set('editing', true);
    case EDIT_RECORD_SUCCESS:
      return state
        .set('editSuccess', true)
        .set('editing', false);
    case EDIT_RECORD_ERROR:
      return state.set('editing', false);
    case DELETE_RECORD:
      return state.set('deleting', true);
    case DELETE_RECORD_SUCCESS:
      return state.set('deleting', false);
    case DELETE_RECORD_ERROR:
      return state.set('deleting', false);
    case TOGGLE_NULL:
      return state.set('isRelationComponentNull', true);
    case CANCEL_CHANGES:
      return state
        .set('formErrors', List([]))
        .set('record', state.get('initialRecord'));
    case SET_FORM_VALIDATIONS:
      return state
        .set('formValidations', List(action.formValidations));
    case SET_FORM:
      return state.set('form', Map(action.form));
    case SET_FORM_ERRORS:
      return state
        .set('formErrors', List(action.formErrors))
        .set('didCheckErrors', !state.get('didCheckErrors'));
    case RESET_EDIT_SUCCESS:
      return state.set('editSuccess', false);
    default:
      return state;
  }
}

export default editReducer;
