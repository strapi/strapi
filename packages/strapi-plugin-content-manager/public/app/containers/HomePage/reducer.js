/*
 * Reducer
 *
 * The reducer takes care of our data. Using actions, we can change our
 * application state.
 * To add a new action, add it to the switch statement in the reducer function
 *
 * Example:
 * case YOUR_ACTION_CONSTANT:
 *   return state.set('yourStateVariable', true);
 */

import { LOAD_DEFAULT } from './constants';
import { fromJS } from 'immutable';

// The initial state of the App
const initialState = fromJS({
  default: ''
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_DEFAULT:
      return state
        .set('name', 'Content Manager');
    default:
      return state;
  }
}

export default appReducer;
