import reducer from '../reducer';
import { SHOW_NEW_NOTIFICATION, HIDE_NEW_NOTIFICATION } from '../constants';

describe('AMDIN | CONTAINERS | NEWNOTIFICATION | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('SHOW_NEW_NOTIFICATION', () => {
    it('should add a notification', () => {
      const action = {
        type: SHOW_NEW_NOTIFICATION,
        config: {
          type: 'success',
          message: {
            id: 'notification.message',
          },
        },
      };
      const initialState = {
        notifications: [],
        notifId: 0,
      };
      const expected = {
        notifications: [
          {
            id: 0,
            type: 'success',
            message: { id: 'notification.message' },
            title: null,
            link: null,
            timeout: 2500,
            blockTransition: false,
            centered: false,
            uid: null,
            onClose: null,
          },
        ],
        notifId: 1,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('HIDE_NEW_NOTIFICATION', () => {
    it('should remove a notification if the notification exist', () => {
      const action = {
        type: HIDE_NEW_NOTIFICATION,
        id: 1,
      };
      const initialState = {
        notifications: [{ id: 1, message: { id: 'notification.message' }, type: 'success' }],
      };
      const expected = {
        notifications: [],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should not remove the notification if the notification does not exist', () => {
      const action = {
        type: HIDE_NEW_NOTIFICATION,
        id: 3,
      };
      const initialState = {
        notifications: [{ id: 1, message: { id: 'notification.message' }, type: 'success' }],
      };
      const expected = {
        notifications: [{ id: 1, message: { id: 'notification.message' }, type: 'success' }],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
