import { fromJS } from 'immutable';
import {
  PLUGIN_LOADED,
} from './constants';

const initialState = fromJS({
  plugins: {},
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case PLUGIN_LOADED:
      return state.setIn(['plugins', action.plugin.id], action.plugin);
    default:
      return state;
  }
}

export default appReducer;
