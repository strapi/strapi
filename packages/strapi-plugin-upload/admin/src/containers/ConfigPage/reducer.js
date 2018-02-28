/**
 *
 * ConfigPage reducer
 *
 */

import { fromJS, Map } from 'immutable';

import {
  GET_SETTINGS,
  GET_SETTINGS_SUCCEEDED,
  ON_CANCEL,
} from './constants';

const initialState = fromJS({
  env: '',
  initialData: Map({}),
  modifiedData: Map({}),
  settings: {},
});

function configPageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_SETTINGS:
      return state.update('env', () => action.env);
    case GET_SETTINGS_SUCCEEDED:
      return state
        .update('initialData', () => Map(action.initialData))
        .update('modifiedData', () => Map(action.initialData))
        .update('settings', () => action.settings);
    case ON_CANCEL:
      return state.update('modifiedData', () => state.get('initialData'));
    default:
      return state;
  }
}

export default configPageReducer;
