/*
 *
 * NotificationProvider reducer
 *
 */

import { fromJS } from 'immutable';
import {
  SHOW_NOTIFICATION,
  HIDE_NOTIFICATION,
} from './constants';

const initialState = fromJS({
  notifications: [],
});

function notificationProviderReducer(state = initialState, action) {
  // Init variable
  let index;

  switch (action.type) {
    case SHOW_NOTIFICATION:
      return state.set('notifications', state.get('notifications').push({
        message: action.message || 'app.utils.defaultMessage',
        status: action.status || 'success',
        id: action.id,
      }));
    case HIDE_NOTIFICATION:
      // Check that the index exists
      state.get('notifications').forEach((notification, i) => {
        if (notification.id === action.id) {
          index = i;
        }
      });

      if (typeof index !== 'undefined') {
        // Remove the notification
        return state.set('notifications', state.get('notifications').splice(index, 1));
      }

      // Notification not found, return the current state
      return state;
    default:
      return state;
  }
}

export default notificationProviderReducer;
