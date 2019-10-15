/*
 *
 * NotificationProvider actions
 *
 */

import { dispatch } from '../../app';

import { SHOW_NOTIFICATION, HIDE_NOTIFICATION } from './constants';

let nextNotificationId = 0;

export function showNotification(message, status) {
  nextNotificationId++; // eslint-disable-line no-plusplus

  // Start timeout to hide the notification
  (id => {
    setTimeout(() => {
      dispatch(hideNotification(id));
    }, 2500);
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
