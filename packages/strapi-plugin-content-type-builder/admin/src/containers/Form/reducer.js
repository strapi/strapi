/*
 *
 * Form reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import {
  CHANGE_INPUT,
  CHANGE_INPUT_ATTRIBUTE,
  CONNECTIONS_FETCH_SUCCEEDED,
  CONTENT_TYPE_ACTION_SUCCEEDED,
  CONTENT_TYPE_CREATE,
  CONTENT_TYPE_FETCH_SUCCEEDED,
  RESET_DID_FETCH_MODEL_PROP,
  SET_ATTRIBUTE_FORM,
  SET_FORM,
} from './constants';

/* eslint-disable new-cap */

const initialState = fromJS({
  selectOptionsFetchSucceeded: false,
  selectOptions: List(),
  form: List(),
  initialData: Map(),
  initialDataEdit: Map(),
  modifiedDataAttribute: Map(),
  modifiedData: Map(),
  modifiedDataEdit: Map(),
  isFormSet: false,
  didFetchModel: true,
  shouldRefetchContentType: false,
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
        .set('isFormSet', false);
    case CONTENT_TYPE_CREATE:
      return state
        .set('isFormSet', false)
        .set('didFetchModel', true);
    case CONTENT_TYPE_FETCH_SUCCEEDED:
      return state
        .set('didFetchModel', false)
        .set('initialDataEdit', action.data)
        .set('modifiedDataEdit', action.data);
    case RESET_DID_FETCH_MODEL_PROP:
      return state
        .set('didFetchModel', true);
    case SET_ATTRIBUTE_FORM: {
      if (state.get('isFormSet')) {
        return state.set('form', Map(action.form));
      }

      return state
        .set('isFormSet', true)
        .set('form', Map(action.form))
        .set('modifiedDataAttribute', action.attribute);
    }
    case SET_FORM: {
      if (state.get('isFormSet')) {
        return state.set('form', Map(action.form));
      }
      return state
        .set('isFormSet', true)
        .set('form', Map(action.form))
        .set('initialData', action.data)
        .set('modifiedData', action.data);
    }
    default:
      return state;
  }
}

export default formReducer;
