/*
 *
 * Admin reducer
 *
 */

import { fromJS, Map } from 'immutable';
import {
  GET_INIT_DATA_SUCCEEDED,
  GET_SECURED_DATA_SUCCEEDED,
  HIDE_LEFT_MENU,
  HIDE_LOGOUT,
  SET_APP_ERROR,
  SET_APP_SECURED,
  SHOW_LEFT_MENU,
  SHOW_LOGOUT,
  UNSET_APP_SECURED,
} from './constants';

const initialState = fromJS({
  autoReload: false,
  appError: false,
  currentEnvironment: 'development',
  didGetSecuredData: false,
  isLoading: true,
  isSecured: false,
  layout: Map({}),
  // NOTE: This should be the models and our stuffs
  // Since this api is not implemented yet I just set this vague key ATM
  securedData: {},
  showMenu: true,
  showLogoutComponent: false,
  strapiVersion: '3',
  uuid: false,
});

function adminReducer(state = initialState, action) {
  switch (action.type) {
    case GET_INIT_DATA_SUCCEEDED: {
      const {
        data: { autoReload, currentEnvironment, layout, strapiVersion, uuid },
      } = action;

      return state
        .update('autoReload', () => autoReload)
        .update('currentEnvironment', () => currentEnvironment)
        .update('isLoading', () => false)
        .update('layout', () => Map(layout))
        .update('strapiVersion', () => strapiVersion)
        .update('uuid', () => uuid);
    }
    case GET_SECURED_DATA_SUCCEEDED:
      return state
        .update('didGetSecuredData', v => !v)
        .update('securedData', () => action.data);
    case HIDE_LEFT_MENU:
      return state.update('showMenu', () => false);
    case HIDE_LOGOUT:
      return state.update('showLogoutComponent', () => false);
    case SET_APP_ERROR:
      return state.update('appError', () => true);
    case SET_APP_SECURED:
      return state.update('isSecured', () => true);
    case SHOW_LEFT_MENU:
      return state.update('showMenu', () => true);
    case SHOW_LOGOUT:
      return state.update('showLogoutComponent', () => true);
    case UNSET_APP_SECURED:
      return state.update('isSecured', () => false);
    default:
      return state;
  }
}

export default adminReducer;
