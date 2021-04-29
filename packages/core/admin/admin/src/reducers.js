/**
 * Combine all reducers in this file and export the combined reducers.
 */

import { combineReducers } from 'redux-immutable';

import globalReducer from './containers/App/reducer';
import adminReducer from './containers/Admin/reducer';
import languageProviderReducer from './containers/LanguageProvider/reducer';
import notificationProviderReducer from './containers/NotificationProvider/reducer';
import newNotificationReducer from './containers/NewNotification/reducer';
import permissionsManagerReducer from './containers/PermissionsManager/reducer';
import menuReducer from './containers/LeftMenu/reducer';
/**
 * Creates the main reducer with the dynamically injected ones
 */
export default function createReducer(injectedReducers) {
  return combineReducers({
    app: globalReducer,
    admin: adminReducer,
    language: languageProviderReducer,
    notification: notificationProviderReducer,
    newNotification: newNotificationReducer,
    permissionsManager: permissionsManagerReducer,
    menu: menuReducer,
    ...injectedReducers,
  });
}
