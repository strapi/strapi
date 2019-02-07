
import {
  intialize,
} from '../actions';
import {
  INITIALIZE,
} from '../constants';

describe('Initializer actions', () => {
  describe('Initialize Action', () => {
    it('has a type of INITIALIZE', () => {
      const expected = {
        type: INITIALIZE,
      };
      expect(intialize()).toEqual(expected);
    });
  });
});
