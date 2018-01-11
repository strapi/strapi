import { fromJS } from 'immutable';
import {
  UPDATE_PLUGIN,
  PLUGIN_DELETED,
  PLUGIN_LOADED,
  UNSET_HAS_USERS_PLUGIN,
} from './constants';

const initialState = fromJS({
  plugins: {},
  hasUserPlugin: true,
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case PLUGIN_LOADED:
      return state.setIn(['plugins', action.plugin.id], fromJS(action.plugin));
    case UPDATE_PLUGIN:
      return state.setIn(['plugins', action.pluginId, action.updatedKey], fromJS(action.updatedValue));
    case PLUGIN_DELETED:
      return state.deleteIn(['plugins', action.plugin]);
    case UNSET_HAS_USERS_PLUGIN:
      return state.set('hasUserPlugin', false);
    default:
      return state;
  }
}

export default appReducer;
