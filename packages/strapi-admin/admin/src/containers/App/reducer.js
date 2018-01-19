// Shared constants
import {
  DISABLE_GLOBAL_OVERLAY_BLOCKER,
  ENABLE_GLOBAL_OVERLAY_BLOCKER,
} from 'constants/overlayBlocker';

import { fromJS } from 'immutable';

import {
  FREEZE_APP,
  PLUGIN_DELETED,
  PLUGIN_LOADED,
  UNFREEZE_APP,
  UNSET_HAS_USERS_PLUGIN,
  UPDATE_PLUGIN,
} from './constants';

const initialState = fromJS({
  blockApp: false,
  hasUserPlugin: true,
  plugins: {},
  showGlobalAppBlocker: true,
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case DISABLE_GLOBAL_OVERLAY_BLOCKER:
      return state.set('showGlobalAppBlocker', false);
    case ENABLE_GLOBAL_OVERLAY_BLOCKER:
      return state.set('showGlobalAppBlocker', true);
    case FREEZE_APP:
      return state.set('blockApp', true);
    case PLUGIN_LOADED:
      return state.setIn(['plugins', action.plugin.id], fromJS(action.plugin));
    case UPDATE_PLUGIN:
      return state.setIn(['plugins', action.pluginId, action.updatedKey], fromJS(action.updatedValue));
    case PLUGIN_DELETED:
      return state.deleteIn(['plugins', action.plugin]);
    case UNFREEZE_APP:
      return state.set('blockApp', false);
    case UNSET_HAS_USERS_PLUGIN:
      return state.set('hasUserPlugin', false);
    default:
      return state;
  }
}

export default appReducer;
