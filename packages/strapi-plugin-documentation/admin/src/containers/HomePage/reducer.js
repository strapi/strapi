/*
 *
 * HomePage reducer
 *
 */

import { fromJS, List } from 'immutable';
import {
  GET_DOC_INFOS_SUCCEEDED,
  ON_CHANGE,
  ON_CLICK_DELETE_DOC,
  SET_FORM_ERRORS,
} from './constants';

const initialState = fromJS({
  currentDocVersion: '',
  didCheckErrors: false,
  docVersions: List([]),
  form: fromJS([]),
  formErrors: fromJS({}),
  isLoading: true,
  prefix: '/documentation',
  versionToDelete: '',
});

function homePageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DOC_INFOS_SUCCEEDED:
      return state
        .update('docVersions', () => List(action.data.docVersions))
        .update('currentDocVersion', () => action.data.currentVersion)
        .update('isLoading', () => false)
        .update('prefix', () => action.data.prefix)
        .update('form', () => fromJS(action.data.form))
        .update('versionToDelete', () => '');
    case ON_CHANGE:
      return state
        .updateIn(action.keys, () => action.value);
    case ON_CLICK_DELETE_DOC:
      return state.update('versionToDelete', () => action.version);
    case SET_FORM_ERRORS:
      return state
        .update('didCheckErrors', v => !v)
        .update('formErrors', () => fromJS(action.errors));
    default:
      return state;
  }
}

export default homePageReducer;
