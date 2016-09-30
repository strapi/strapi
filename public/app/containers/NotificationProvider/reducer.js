/*
 *
 * NotificationProvider reducer
 *
 */

import { fromJS } from 'immutable';
import _ from 'lodash';
import {
  SHOW_NOTIFICATION,
  HIDE_NOTIFICATION,
} from './constants';

const initialState = fromJS({
  notifications: [],
});

function notificationProviderReducer(state = initialState, action) {
  switch (action.type) {
    case SHOW_NOTIFICATION:
      return state.set('notifications', state.get('notifications').push({
        message: action.message,
        status: action.status,
        id: action.id,
      }));
    case HIDE_NOTIFICATION:
      // Check that the index exists
      let index;
      state.get('notifications').forEach((notification, i) => {
        if (notification.id === action.id) {
          index = i;
        }
      });

      if (typeof index !== 'undefined') {
        // Remove the notification
        return state.set('notifications', state.get('notifications').splice(index, 1));
      } else {
        // Notification not found, return the current state
        return state;
      }

    default:
      return state;
  }
}

export default notificationProviderReducer;
