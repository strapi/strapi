import { fromJS } from 'immutable';
import {
  UPDATE_PLUGIN,
  PLUGIN_LOADED,
} from './constants';

const initialState = fromJS({
  plugins: {},
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case PLUGIN_LOADED:
      return state.setIn(['plugins', action.plugin.id], fromJS(action.plugin));
    case UPDATE_PLUGIN:
      return state.setIn(['plugins', action.pluginId, action.updatedKey], fromJS(action.updatedValue));
    default:
      return state;
  }
}

export default appReducer;
