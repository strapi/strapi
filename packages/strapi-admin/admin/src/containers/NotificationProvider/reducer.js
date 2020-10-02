/*
 *
 * NotificationProvider reducer
 *
 */

import produce from 'immer';
import { get } from 'lodash';
import { SHOW_NOTIFICATION, SHOW_NEW_NOTIFICATION, HIDE_NOTIFICATION } from './constants';

const initialState = {
  notifications: [],
};

const notificationReducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case SHOW_NEW_NOTIFICATION: {
        draftState.notifications.push({
          ...action.config,
          id: action.id,
          type: get(action, ['config', 'type'], 'success'),
          message: get(action, ['config', 'message'], {
            id: 'notification.success.saved',
            defaultMessage: 'Saved',
          }),
        });
        break;
      }
      case SHOW_NOTIFICATION: {
        draftState.notifications.push({
          message: action.message || 'app.utils.defaultMessage',
          type: action.status || 'success',
          id: action.id,
        });
        break;
      }
      case HIDE_NOTIFICATION: {
        const indexToRemove = state.notifications.findIndex(notif => notif.id === action.id);

        if (indexToRemove !== -1) {
          draftState.notifications.splice(indexToRemove, 1);
        }
        break;
      }

      default: {
        return draftState;
      }
    }
  });

export default notificationReducer;
