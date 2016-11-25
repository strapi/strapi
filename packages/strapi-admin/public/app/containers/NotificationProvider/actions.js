/*
 *
 * NotificationProvider actions
 *
 */

import {
  SHOW_NOTIFICATION,
  HIDE_NOTIFICATION,
} from './constants';

import { dispatch } from '../../app';
let nextNotificationId = 0;

export function showNotification(message, status) {
  nextNotificationId++;

  // Start timeout to hide the notification
  ((id) => {
    setTimeout(() => {
      dispatch(hideNotification(id));
    }, 5000);
  })(nextNotificationId);

  return {
    type: SHOW_NOTIFICATION,
    message,
    status,
    id: nextNotificationId,
  };
}

export function hideNotification(id) {
  return {
    type: HIDE_NOTIFICATION,
    id,
  };
}
