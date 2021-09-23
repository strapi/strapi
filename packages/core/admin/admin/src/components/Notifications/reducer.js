import produce from 'immer';
import get from 'lodash/get';

const initialState = {
  notifId: 0,
  notifications: [],
};

const notificationReducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'SHOW_NOTIFICATION': {
        draftState.notifications.push({
          // No action.config spread to limit the notification API and avoid customization
          id: state.notifId,
          type: get(action, ['config', 'type'], 'success'),
          message: get(action, ['config', 'message'], {
            id: 'notification.success.saved',
            defaultMessage: 'Saved',
          }),
          link: get(action, ['config', 'link'], null),
          timeout: get(action, ['config', 'timeout'], 2500),
          blockTransition: get(action, ['config', 'blockTransition'], false),
          onClose: get(action, ['config', 'onClose'], null),
        });
        draftState.notifId = state.notifId + 1;
        break;
      }
      case 'HIDE_NOTIFICATION': {
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
export { initialState };
