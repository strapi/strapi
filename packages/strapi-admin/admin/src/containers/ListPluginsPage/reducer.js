/*
 *
 * ListPluginsPage reducer
 *
 */

import { fromJS, Map } from 'immutable';
import {
  DELETE_PLUGIN_SUCCEEDED,
  GET_PLUGINS_SUCCEEDED,
  ON_DELETE_PLUGIN_CLICK,
} from './constants';

const initialState = fromJS({
  deleteActionSucceeded: false,
  plugins: Map({}),
  pluginToDelete: '',
});

function listPluginsPageReducer(state = initialState, action) {
  switch (action.type) {
    case DELETE_PLUGIN_SUCCEEDED: {
      if (action.plugin) {
        return state
          .deleteIn(['plugins', action.plugin])
          .set('deleteActionSucceeded', !state.get('deleteActionSucceeded'));
      }

      return state
        .set('deleteActionSucceeded', !state.get('deleteActionSucceeded'));
    }
    case GET_PLUGINS_SUCCEEDED:
      return state
        .set('plugins', Map(action.plugins));
    case ON_DELETE_PLUGIN_CLICK:
      return state
        .set('pluginToDelete', action.pluginToDelete);
    default:
      return state;
  }
}

export default listPluginsPageReducer;
