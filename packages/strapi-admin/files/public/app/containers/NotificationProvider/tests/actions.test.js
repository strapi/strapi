import expect from 'expect';
import {
  showNotification,
} from '../actions';
import {
  SHOW_NOTIFICATION,
} from '../constants';

describe('NotificationProvider actions', () => {
  describe('Default Action', () => {
    it('has a type of SHOW_NOTIFICATION', () => {
      const message = 'Well done!';
      const status = 'success';

      const expected = {
        type: SHOW_NOTIFICATION,
        message,
        status,
        id: 1,
      };
      expect(showNotification(expected.message, expected.status)).toEqual(expected);
    });
  });
});
