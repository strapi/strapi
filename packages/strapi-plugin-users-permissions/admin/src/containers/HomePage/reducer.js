/*
 *
 * HomePage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';

import {
  CANCEL_CHANGES,
  DELETE_DATA,
  DELETE_DATA_SUCCEEDED,
  FETCH_DATA_SUCCEEDED,
  ON_CHANGE,
  RESET_PROPS,
  SET_DATA_TO_EDIT,
  SET_FORM,
  SET_FORM_ERRORS,
  SUBMIT_SUCCEEDED,
  UNSET_DATA_TO_EDIT,
} from './constants';

const initialState = fromJS({
  data: List([]),
  dataToDelete: Map({}),
  dataToEdit: '',
  deleteEndPoint: '',
  didCheckErrors: false,
  formErrors: List([]),
  initialData: Map({}),
  modifiedData: Map({}),
  showButtons: false,
  didDeleteData: false,
});

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case CANCEL_CHANGES:
      return state
        .set('formErrors', List([]))
        .update('modifiedData', () => state.get('initialData'));
    case DELETE_DATA:
      return state
        .set('dataToDelete', Map(action.dataToDelete))
        .set('deleteEndPoint', action.deleteEndPoint);
    case DELETE_DATA_SUCCEEDED:
      return state
        .update('data', list => list.splice(action.indexDataToDelete, 1))
        .set('deleteEndPoint', '')
        .set('dataToDelete', Map({}))
        .update('didDeleteData', (v) => !v);
    case FETCH_DATA_SUCCEEDED:
      return state
        .set('data', List(action.data))
        .set('initialData', action.modifiedData)
        .set('modifiedData', action.modifiedData);
    case ON_CHANGE:
      return state
        .updateIn(action.keys, () => action.value);
    case RESET_PROPS:
      return initialState;
    case SET_DATA_TO_EDIT:
      return state.update('dataToEdit', () => action.dataToEdit);
    case SET_FORM:
      return state
        .set('formErrors', List([]))
        .set('initialData', action.form)
        .set('modifiedData', action.form);
    case SET_FORM_ERRORS:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .set('formErrors', List(action.formErrors));
    case SUBMIT_SUCCEEDED:
      return state
        .set('formErrors', List([]))
        .update('dataToEdit', () => '')
        .update('initialData', () => state.get('modifiedData'));
    case UNSET_DATA_TO_EDIT:
      return state
        .set('formErrors', List([]))
        .update('dataToEdit', () => '')
        .update('modifiedData', () => state.get('initialData'));
    default:
      return state;
  }
}

export default homePageReducer;
