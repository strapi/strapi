/*
 *
 * Admin reducer
 *
 */

import { fromJS, Map } from 'immutable';
import {
  GET_INIT_DATA_SUCCEEDED,
  HIDE_LEFT_MENU,
  SET_APP_ERROR,
  SHOW_LEFT_MENU,
} from './constants';

const initialState = fromJS({
  autoReload: false,
  appError: false,
  currentEnvironment: 'development',
  isLoading: true,
  isSecured: false,
  layout: Map({}),
  showMenu: true,
  strapiVersion: '3',
  uuid: false,
});

function adminReducer(state = initialState, action) {
  switch (action.type) {
    case GET_INIT_DATA_SUCCEEDED:
      return state
        .update('autoReload', () => action.data.autoReload.enabled)
        .update('currentEnvironment', () => action.data.currentEnvironment)
        .update('isLoading', () => false)
        .update('layout', () => Map(action.data.layout))
        .update('strapiVersion', () => action.data.strapiVersion)
        .update('uuid', () => action.data.uuid);
    case HIDE_LEFT_MENU:
      return state.update('showMenu', () => false);
    case SET_APP_ERROR:
      return state.update('appError', () => true);
    case SHOW_LEFT_MENU:
      return state.update('showMenu', () => true);
    default:
      return state;
  }
}

export default adminReducer;
