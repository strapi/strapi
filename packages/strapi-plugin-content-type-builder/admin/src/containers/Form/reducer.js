/*
 *
 * Form reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import {
  CHANGE_INPUT,
  CONNECTIONS_FETCH_SUCCEEDED,
  CONTENT_TYPE_FETCH_SUCCEEDED,
  RESET_DID_FETCH_MODEL_PROP,
  SET_FORM,
} from './constants';

/* eslint-disable new-cap */

const initialState = fromJS({
  selectOptionsFetchSucceeded: false,
  selectOptions: List(),
  form: List(),
  initialData: Map(),
  initialDataEdit: Map(),
  modifiedData: Map(),
  modifiedDataEdit: Map(),
  isFormSet: false,
  didFetchModel: false,
});

function formReducer(state = initialState, action) {
  switch (action.type) {
    case CHANGE_INPUT:
      return state
        .updateIn([action.objectToModify, action.key], () => action.value);
    case CONNECTIONS_FETCH_SUCCEEDED:
      return state
        .set('selectOptions', List(action.connections))
        .set('selectOptionsFetchSucceeded', !state.get('selectOptionsFetchSucceeded'));
    case CONTENT_TYPE_FETCH_SUCCEEDED:
      return state
        .set('didFetchModel', true)
        .set('initialDataEdit', action.data)
        .set('modifiedDataEdit', action.data);
    case RESET_DID_FETCH_MODEL_PROP:
      return state
        .set('didFetchModel', false);
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
