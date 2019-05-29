/**
 * Combine all reducers in this file and export the combined reducers.
 */

import { combineReducers } from 'redux-immutable';

import globalReducer from './containers/App/reducer';
import languageProviderReducer from './containers/LanguageProvider/reducer';
import notificationProviderReducer from './containers/NotificationProvider/reducer';

/**
 * Creates the main reducer with the dynamically injected ones
 */
export default function createReducer(injectedReducers) {
  return combineReducers({
    app: globalReducer,
    language: languageProviderReducer,
    notification: notificationProviderReducer,
    ...injectedReducers,
  });
}
