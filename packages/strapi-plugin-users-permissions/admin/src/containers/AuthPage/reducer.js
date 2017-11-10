/*
 *
 * AuthPage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';
import {
  ON_CHANGE_INPUT,
  SET_ERRORS,
  SET_FORM,
} from './constants';

const initialState = fromJS({
  didCheckErrors: false,
  formErrors: List([]),
  modifiedData: Map({}),
});

function authPageReducer(state = initialState, action) {
  switch (action.type) {
    case ON_CHANGE_INPUT:
      return state
        .updateIn(['modifiedData', action.key], () => action.value);
    case SET_ERRORS:
      return state
        .set('didCheckErrors', !state.get('didCheckErrors'))
        .set('formErrors', List(action.formErrors));
    case SET_FORM:
      return state.set('modifiedData', Map(action.data));
    default:
      return state;
  }
}

export default authPageReducer;
