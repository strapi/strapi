/*
 *
 * Form reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import {
  CONNECTIONS_FETCH_SUCCEEDED,
  SET_FORM,
} from './constants';

/* eslint-disable new-cap */

const initialState = fromJS({
  selectOptionsFetchSucceeded: false,
  selectOptions: List(),
  form: List(),
  initialData: Map(),
  modifiedData: Map(),
});

function formReducer(state = initialState, action) {
  switch (action.type) {
    case CONNECTIONS_FETCH_SUCCEEDED:
      return state
        .set('selectOptions', List(action.connections))
        .set('selectOptionsFetchSucceeded', !state.get('selectOptionsFetchSucceeded'));
    case SET_FORM:
      return state
        .set('form', Map(action.form))
        .set('initialData', action.data)
        .set('modifiedData', action.data);
    default:
      return state;
  }
}

export default formReducer;
