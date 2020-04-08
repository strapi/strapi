/*
 *
 * Admin reducer
 *
 */

import { fromJS } from 'immutable';
import {
  GET_PLUGINS_FROM_MARKETPLACE_SUCCEEDED,
  SET_APP_ERROR,
} from './constants';

const initialState = fromJS({
  appError: false,
  pluginsFromMarketplace: [],
});

function adminReducer(state = initialState, action) {
  switch (action.type) {
    case GET_PLUGINS_FROM_MARKETPLACE_SUCCEEDED:
      return state.update('pluginsFromMarketplace', () =>
        fromJS(action.plugins)
      );
    case SET_APP_ERROR:
      return state.update('appError', () => true);
    default:
      return state;
  }
}

export default adminReducer;
