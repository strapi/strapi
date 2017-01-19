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

import { fromJS } from 'immutable';

import { LOAD, LOAD_SUCCESS } from './constants';

// The initial state of the App
const initialState = fromJS({
  loading: false,
  name: null
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD:
      return state
        .set('loading', true);
    case LOAD_SUCCESS:
      return state
        .set('name', action.data.name)
        .set('loading', false);
    default:
      return state;
  }
}

export default appReducer;
