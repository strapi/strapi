import { initialize, initializeSucceeded } from '../actions';
import { INITIALIZE, INITIALIZE_SUCCEEDED } from '../constants';

describe('Initializer actions', () => {
  describe('Initialize Action', () => {
    it('has a type of INITIALIZE', () => {
      const expected = {
        type: INITIALIZE,
      };
      expect(initialize()).toEqual(expected);
    });
  });

  describe('InitializeSucceeded Action', () => {
    it('has a type of INITIALIZE_SUCCEEDED and returns the given data', () => {
      const data = { hasAdmin: true };
      const expected = {
        type: INITIALIZE_SUCCEEDED,
        data,
      };
      expect(initializeSucceeded(data)).toEqual(expected);
    });
  });
});
