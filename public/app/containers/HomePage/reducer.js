/*
 * AppReducer
 *
 * The reducer takes care of our data. Using actions, we can change our
 * application state.
 * To add a new action, add it to the switch statement in the reducer function
 *
 * Example:
 * case YOUR_ACTION_CONSTANT:
 *   return state.set('yourStateVariable', true);
 */

import {
  LOAD_GENERAL_SETTINGS_SUCCESS,
  LOAD_GENERAL_SETTINGS,
  LOAD_GENERAL_SETTINGS_ERROR,
} from './constants';
import { fromJS } from 'immutable';

// The initial state of the App
const initialState = fromJS({
  loading: false,
  error: false,
  generalSettings: false,
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_GENERAL_SETTINGS:
      return state
        .set('loading', true)
        .set('error', false)
        .set('generalSettings', false);
    case LOAD_GENERAL_SETTINGS_SUCCESS:
      return state
        .set('generalSettings', action.generalSettings)
        .set('loading', false);
    case LOAD_GENERAL_SETTINGS_ERROR:
      return state
        .set('error', action.error)
        .set('loading', false);
    default:
      return state;
  }
}

export default appReducer;
