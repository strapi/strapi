import { fromJS } from 'immutable';
import {
  REGISTER_PLUGIN,
} from './constants';

const initialState = fromJS({
  plugins: {},
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case REGISTER_PLUGIN:
      return state.setIn(['plugins', action.plugin.name], action.plugin);
    default:
      return state;
  }
}

export default appReducer;
