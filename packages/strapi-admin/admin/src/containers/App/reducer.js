// Shared constants
import {
  DISABLE_GLOBAL_OVERLAY_BLOCKER,
  ENABLE_GLOBAL_OVERLAY_BLOCKER,
} from 'constants/overlayBlocker';

import { fromJS } from 'immutable';

import {
  UPDATE_PLUGIN,
  PLUGIN_DELETED,
  PLUGIN_LOADED,
  UNSET_HAS_USERS_PLUGIN,
} from './constants';

const initialState = fromJS({
  showGlobalAppBlocker: true,
  plugins: {},
  hasUserPlugin: true,
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case DISABLE_GLOBAL_OVERLAY_BLOCKER:
      return state.set('showGlobalAppBlocker', false);
    case ENABLE_GLOBAL_OVERLAY_BLOCKER:
      return state.set('showGlobalAppBlocker', true);
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
