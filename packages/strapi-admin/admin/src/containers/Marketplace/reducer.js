import { fromJS, List } from 'immutable';

import {
  DOWNLOAD_PLUGIN,
  DOWNLOAD_PLUGIN_SUCCEEDED,
  GET_AVAILABLE_AND_INSTALLED_PLUGINS_SUCCEEDED,
  RESET_PROPS,
} from './constants';

const initialState = fromJS({
  availablePlugins: List([]),
  installedPlugins: List([]),
  isLoading: true,
  pluginToDownload: null,
});

function marketplaceReducer(state = initialState, action) {
  switch (action.type) {
    case DOWNLOAD_PLUGIN:
      return state.update('pluginToDownload', () => action.pluginToDownload);
    case DOWNLOAD_PLUGIN_SUCCEEDED:
      return state
        .update('installedPlugins', list => list.push(state.get('pluginToDownload')))
        .update('pluginToDownload', () => null);
    case GET_AVAILABLE_AND_INSTALLED_PLUGINS_SUCCEEDED:
      return state
        .update('availablePlugins', () => List(action.availablePlugins))
        .update('installedPlugins', () => List(action.installedPlugins))
        .update('isLoading', () => false);
    case RESET_PROPS:
      return initialState;
    default:
      return state;
  }
}

export default marketplaceReducer;
