/*
 *
 * Admin actions
 *
 */

import {
  GET_PLUGINS_FROM_MARKETPLACE_SUCCEEDED,
  SET_APP_ERROR,
} from './constants';

export function getPluginsFromMarketPlaceSucceeded(plugins) {
  return {
    type: GET_PLUGINS_FROM_MARKETPLACE_SUCCEEDED,
    plugins,
  };
}

export function setAppError() {
  return {
    type: SET_APP_ERROR,
  };
}
