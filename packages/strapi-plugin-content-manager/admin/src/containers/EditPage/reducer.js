/**
 *
 * EditPage reducer
 *
 */

import { fromJS, Map, List } from 'immutable';
import {
  CHANGE_DATA,
  GET_DATA_SUCCEEDED,
  INIT_MODEL_PROPS,
  ON_CANCEL,
  RESET_PROPS,
  SET_FILE_RELATIONS,
  SET_FORM_ERRORS,
  SET_LOADER,
  SUBMIT_SUCCESS,
  UNSET_LOADER,
} from './constants';

const initialState = fromJS({
  didCheckErrors: true,
  fileRelations: List([]),
  formErrors: List([]),
  formValidations: List([]),
  isCreating: false,
  id: '',
  initialRecord: Map({}),
  modelName: '',
  pluginHeaderTitle: 'New Entry',
  record: Map({}),
  showLoader: false,
  source: 'content-manager',
  submitSuccess: false,
});

function editPageReducer(state = initialState, action) {
  switch (action.type) {
    case CHANGE_DATA:
      return state.updateIn(action.keys, () => action.value);
    case GET_DATA_SUCCEEDED:
      return state
        .update('id', () => action.id)
        .update('initialRecord', () => Map(action.data))
        .update('pluginHeaderTitle', () => action.pluginHeaderTitle)
        .update('record', () => Map(action.data));
    case INIT_MODEL_PROPS:
      return state
        .update('formValidations', () => List(action.formValidations))
        .update('isCreating', () => action.isCreating)
        .update('modelName', () => action.modelName)
        .update('source', () => action.source);
    case ON_CANCEL:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List([]))
        .update('record', () => state.get('initialRecord'));
    case RESET_PROPS:
      return initialState;
    case SET_FILE_RELATIONS:
      return state.set('fileRelations', List(action.fileRelations));
    case SET_FORM_ERRORS:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List(action.formErrors));
    case SET_LOADER:
      return state
        .update('showLoader', () => true);
    case SUBMIT_SUCCESS:
      return state.update('submitSuccess', (v) => v = !v);
    case UNSET_LOADER:
      return state.update('showLoader', () => false);
    default:
      return state;
  }
}

export default editPageReducer;
