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

import {
  LOAD_GENERAL_SETTINGS_SUCCESS,
  LOAD_GENERAL_SETTINGS,
  LOAD_GENERAL_SETTINGS_ERROR,
  CHANGE_NAME,
  CHANGE_DESCRIPTION,
  CHANGE_VERSION,
  UPDATE_GENERAL_SETTINGS,
  UPDATE_GENERAL_SETTINGS_SUCCESS,
  UPDATE_GENERAL_SETTINGS_ERROR,
  CANCEL_GENERAL_SETTINGS,
} from './constants';
import { fromJS } from 'immutable';

// The initial state of the App
const initialState = fromJS({
  loading: false,
  error: false,

  name: false,
  description: false,
  version: false,
  backup: fromJS({
    name: false,
    description: false,
    version: false,
  }),
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_GENERAL_SETTINGS:
      return state
        .set('loading', true)
        .set('error', false)
        .set('name', false)
        .set('description', false)
        .set('version', false);
    case LOAD_GENERAL_SETTINGS_SUCCESS:
      return state
        .set('loading', false)
        .set('name', action.data.name)
        .set('description', action.data.description)
        .set('version', action.data.version)
        .setIn(['backup', 'name'], action.data.name)
        .setIn(['backup', 'description'], action.data.description)
        .setIn(['backup', 'version'], action.data.version);
    case LOAD_GENERAL_SETTINGS_ERROR:
      return state
        .set('error', action.error)
        .set('loading', false);
    case CHANGE_NAME:
      return state
        .set('name', action.name);
    case CHANGE_DESCRIPTION:
      return state
        .set('description', action.description);
    case CHANGE_VERSION:
      return state
        .set('version', action.version);
    case UPDATE_GENERAL_SETTINGS:
      return state
        .set('loading', true)
        .set('error', false);
    case UPDATE_GENERAL_SETTINGS_SUCCESS:
      return state
        .set('loading', false)
        .setIn(['backup', 'name'], action.data.name)
        .setIn(['backup', 'description'], action.data.description)
        .setIn(['backup', 'version'], action.data.version);
    case UPDATE_GENERAL_SETTINGS_ERROR:
      return state
        .set('error', action.error)
        .set('loading', false);
    case CANCEL_GENERAL_SETTINGS:
      return state
        .set('name', state.get('backup').get('name'))
        .set('description', state.get('backup').get('description'))
        .set('version', state.get('backup').get('version'));
    default:
      return state;
  }
}

export default appReducer;
