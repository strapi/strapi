/*
 *
 * InstallPluginPage reducer
 *
 */

import { fromJS, List } from 'immutable';
import {
  GET_PLUGINS_SUCCEEDED,
  ON_CHANGE,
} from './constants';

const initialState = fromJS({
  availablePlugins: List([]),
  didFetchPlugins: false,
  search: '',
});

function installPluginPageReducer(state = initialState, action) {
  switch (action.type) {
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
