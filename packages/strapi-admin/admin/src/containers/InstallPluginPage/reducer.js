/*
 *
 * InstallPluginPage reducer
 *
 */

import { fromJS, List } from 'immutable';
import {
  DOWNLOAD_PLUGIN,
  DOWNLOAD_PLUGIN_ERROR,
  DOWNLOAD_PLUGIN_SUCCEEDED,
  GET_PLUGINS_SUCCEEDED,
  ON_CHANGE,
} from './constants';

const initialState = fromJS({
  availablePlugins: List([]),
  blockApp: false,
  didFetchPlugins: false,
  pluginToDownload: '',
  search: '',
});

function installPluginPageReducer(state = initialState, action) {
  switch (action.type) {
    case DOWNLOAD_PLUGIN:
      return state
        .set('blockApp', true)
        .set('pluginToDownload', action.pluginToDownload);
    case DOWNLOAD_PLUGIN_ERROR:
      return state
        .set('blockApp', false)
        .set('pluginToDownload', '');
    case DOWNLOAD_PLUGIN_SUCCEEDED:
      return state
        .set('blockApp', false)
        .set('pluginToDownload', '');
    case GET_PLUGINS_SUCCEEDED:
      return state
        .set('didFetchPlugins', true)
        .set('availablePlugins', List(action.availablePlugins));
    case ON_CHANGE:
      return state.updateIn(action.keys, () => action.value);
    default:
      return state;
  }
}

export default installPluginPageReducer;
