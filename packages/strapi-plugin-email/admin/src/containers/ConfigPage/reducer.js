/**
 *
 * ConfigPage reducer
 *
 */

import { fromJS, List, Map } from 'immutable';

import {
  GET_SETTINGS,
  GET_SETTINGS_SUCCEEDED,
  ON_CANCEL,
  ON_CHANGE,
  SET_ERRORS,
  SUBMIT_ERROR,
  SUBMIT_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  appEnvironments: List([]),
  didCheckErrors: false,
  env: '',
  formErrors: List([]),
  initialData: Map({}),
  modifiedData: Map({}),
  settings: {},
  submitSuccess: false,
});

function configPageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_SETTINGS:
      return state.update('env', () => action.env);
    case GET_SETTINGS_SUCCEEDED:
      return state
        .update('appEnvironments', () => List(action.appEnvironments))
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List([]))
        .update('initialData', () => Map(action.initialData))
        .update('modifiedData', () => Map(action.initialData))
        .update('settings', () => action.settings);
    case ON_CANCEL:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List([]))
        .update('modifiedData', () => state.get('initialData'));
    case ON_CHANGE:
      return state
        .updateIn(action.keys, () => action.value);
    case SET_ERRORS:
    case SUBMIT_ERROR:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List(action.errors));
    case SUBMIT_SUCCEEDED:
      return state
        .update('didCheckErrors', (v) => v = !v)
        .update('formErrors', () => List([]))
        .update('initialData', () => Map(action.data))
        .update('modifiedData', () => Map(action.data))
        .update('submitSuccess', (v) => v = !v);
    default:
      return state;
  }
}

export default configPageReducer;
