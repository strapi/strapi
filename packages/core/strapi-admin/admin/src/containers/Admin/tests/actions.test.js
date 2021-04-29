import { setAppError } from '../actions';
import { SET_APP_ERROR } from '../constants';

describe('<Admin /> actions', () => {
  describe('SetAppError Action', () => {
    it('has a type of SET_APP_ERROR', () => {
      const expected = {
        type: SET_APP_ERROR,
      };

      expect(setAppError()).toEqual(expected);
    });
  });
});
