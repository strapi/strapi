/* eslint-disable import/prefer-default-export */
import { SHOW_NEW_NOTIFICATION } from './constants';

let notifIf = 0;

export function showNotification(config) {
  notifIf++;

  return {
    id: notifIf,
    type: SHOW_NEW_NOTIFICATION,
    config,
  };
}
