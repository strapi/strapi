/*
 *
 * Form reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import {
  DEFAULT_ACTION,
  SET_FORM,
} from './constants';

/* eslint-disable new-cap */

const initialState = fromJS({
  form: List(),
  initialData: Map(),
  modifiedData: Map(),
});

function formReducer(state = initialState, action) {
  switch (action.type) {
    case DEFAULT_ACTION:
      return state;
    case SET_FORM:
      return state
        .set('form', Map(action.form))
        .set('initialData', Map(action.data))
        .set('modifiedData', Map(action.data));
    default:
      return state;
  }
}

export default formReducer;
