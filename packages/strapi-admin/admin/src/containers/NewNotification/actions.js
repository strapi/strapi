/* eslint-disable import/prefer-default-export */
import { SHOW_NEW_NOTIFICATION } from './constants';

export function showNotification(config) {
  return {
    type: SHOW_NEW_NOTIFICATION,
    config,
  };
}
