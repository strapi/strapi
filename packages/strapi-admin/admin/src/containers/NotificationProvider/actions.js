/*
 *
 * NotificationProvider actions
 *
 */

/* eslint-disable import/no-cycle */
import { dispatch } from '../../app';

import { SHOW_NOTIFICATION, HIDE_NOTIFICATION, SHOW_NEW_NOTIFICATION } from './constants';

let nextNotificationId = 0;

const show = (config = {}) => {
  nextNotificationId++; // eslint-disable-line no-plusplus

  // Start timeout to hide the notification
  (id => {
    setTimeout(() => {
      dispatch(hideNotification(id));
    }, config.timeout || 2500);
  })(nextNotificationId);
};

// TODO : To remove when the old notification api will be deleted from the codebase
export function showNotification(message, status) {
  show();

  return {
    id: nextNotificationId,
    type: SHOW_NOTIFICATION,
    message,
    status,
  };
}

export function showNewNotification(config) {
  show(config);

  return {
    id: nextNotificationId,
    type: SHOW_NEW_NOTIFICATION,
    config,
  };
}

export function hideNotification(id) {
  return {
    type: HIDE_NOTIFICATION,
    id,
  };
}
