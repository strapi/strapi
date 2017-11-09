/*
 *
 * AuthPage reducer
 *
 */

import { fromJS, Map } from 'immutable';
import {
  ON_CHANGE_INPUT,
  SET_FORM,
} from './constants';

const initialState = fromJS({
  modifiedData: Map({}),
});

function authPageReducer(state = initialState, action) {
  switch (action.type) {
    case ON_CHANGE_INPUT:
      return state
        .updateIn(['modifiedData', action.key], () => action.value);
    case SET_FORM:
      return state.set('modifiedData', Map(action.data));
    default:
      return state;
  }
}

export default authPageReducer;
