/*
 *
 * Form reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import { findIndex } from 'lodash';
import {
  CHANGE_INPUT,
  CHANGE_INPUT_ATTRIBUTE,
  CONNECTIONS_FETCH_SUCCEEDED,
  CONTENT_TYPE_ACTION_SUCCEEDED,
  CONTENT_TYPE_CREATE,
  CONTENT_TYPE_FETCH_SUCCEEDED,
  REMOVE_CONTENT_TYPE_REQUIRED_ERROR,
  RESET_FORM_ERRORS,
  RESET_IS_FORM_SET,
  SET_ATTRIBUTE_FORM,
  SET_ATTRIBUTE_FORM_EDIT,
  SET_FORM,
  SET_FORM_ERRORS,
  SET_BUTTON_LOADING,
  UNSET_BUTTON_LOADING,
} from './constants';

/* eslint-disable new-cap */

const initialState = fromJS({
  didCheckErrors: false,
  selectOptionsFetchSucceeded: false,
  selectOptions: List(),
  form: List(),
  formValidations: List(),
  formErrors: List(),
  initialData: Map(),
  initialDataEdit: Map(),
  modifiedDataAttribute: Map(),
  modifiedData: Map(),
  modifiedDataEdit: Map(),
  isFormSet: false,
  shouldRefetchContentType: false,
  updatedContentType: false,
  showButtonLoading: false,
});

function formReducer(state = initialState, action) {
  switch (action.type) {
    case CHANGE_INPUT:
      return state
        .updateIn([action.objectToModify, action.key], () => action.value);
    case CHANGE_INPUT_ATTRIBUTE: {
      if (action.secondKey) {
        return state.updateIn(['modifiedDataAttribute', 'params', action.secondKey], () => action.value);
      }

      return state.updateIn(['modifiedDataAttribute', action.firstKey], () => action.value);
    }
    case CONNECTIONS_FETCH_SUCCEEDED:
      return state
        .set('selectOptions', List(action.connections))
        .set('selectOptionsFetchSucceeded', !state.get('selectOptionsFetchSucceeded'));
    case CONTENT_TYPE_ACTION_SUCCEEDED:
      return state
        .set('shouldRefetchContentType', !state.get('shouldRefetchContentType'))
        .set('initialDataEdit', state.get('modifiedDataEdit'))
        .set('updatedContentType', !state.get('updatedContentType'))
        .set('isFormSet', false);
    case CONTENT_TYPE_CREATE: {
      if (action.shouldSetUpdatedContentTypeProp) {
        return state
          .set('isFormSet', false)
          .set('updatedContentType', !state.get('updatedContentType'));
      }

      return state.set('isFormSet', false);
    }
    case CONTENT_TYPE_FETCH_SUCCEEDED:
      return state
        .set('initialDataEdit', action.data)
        .set('modifiedDataEdit', action.data);
    case REMOVE_CONTENT_TYPE_REQUIRED_ERROR:
      return state
        .update('formErrors', (list) => list.splice(findIndex(state.get('formErrors').toJS(), ['target', 'name']), 1))
        .set('didCheckErrors', !state.get('didCheckErrors'));
    case RESET_FORM_ERRORS:
      return state.set('formErrors', List());
    case RESET_IS_FORM_SET:
      return state.set('isFormSet', false);
    case SET_ATTRIBUTE_FORM: {
      if (state.get('isFormSet')) {
        return state
          .set('form', Map(action.form))
          .set('didCheckErrors', !state.get('didCheckErrors'));
      }

      return state
        .set('isFormSet', true)
        .set('form', Map(action.form))
        .set('formValidations', List(action.formValidations))
        .set('modifiedDataAttribute', action.attribute);
    }
    case SET_ATTRIBUTE_FORM_EDIT: {
      if (state.get('isFormSet')) {
        return state
          .set('form', Map(action.form))
          .set('didCheckErrors', !state.get('didCheckErrors'));
      }

      return state
        .set('isFormSet', true)
        .set('form', Map(action.form))
        .set('formValidations', List(action.formValidations))
        .set('modifiedDataAttribute', action.attribute);
    }
    case SET_BUTTON_LOADING:
      return state.set('showButtonLoading', true);
    case UNSET_BUTTON_LOADING:
      return state.set('showButtonLoading', false);
    case SET_FORM: {
      if (state.get('isFormSet')) {
        return state.set('form', Map(action.form));
      }

      return state
        .set('isFormSet', true)
        .set('form', Map(action.form))
        .set('formValidations', List(action.formValidations))
        .set('initialData', action.data)
        .set('modifiedData', action.data);
    }
    case SET_FORM_ERRORS:
      return state
        .set('formErrors', List(action.formErrors))
        .set('didCheckErrors', !state.get('didCheckErrors'));
    default:
      return state;
  }
}

export default formReducer;
