/*
 *
 * ListPluginsPage reducer
 *
 */

import { fromJS } from 'immutable';
import {
  DEFAULT_ACTION,
  ON_DELETE_PLUGIN_CLICK,
  DELETE_PLUGIN_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  pluginToDelete: '',
  deleteActionSucceeded: false,
});

function listPluginsPageReducer(state = initialState, action) {
  switch (action.type) {
    case DEFAULT_ACTION:
      return state;
    case ON_DELETE_PLUGIN_CLICK:
      return state.set('pluginToDelete', action.pluginToDelete);
    case DELETE_PLUGIN_SUCCEEDED:
      return state.set('deleteActionSucceeded', !state.get('deleteActionSucceeded'));
    default:
      return state;
  }
}

export default listPluginsPageReducer;
