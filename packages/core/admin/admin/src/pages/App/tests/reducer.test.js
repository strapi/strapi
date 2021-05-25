import { getDataSucceeded } from '../actions';
import appReducer from '../reducer';

describe('<App /> reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      isLoading: true,
      uuid: false,
    };
  });

  it('should return the initial state', () => {
    expect(appReducer(undefined, {})).toEqual(state);
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should handle the set the data correctly', () => {
      const expected = { ...state, uuid: 'true', isLoading: false };

      expect(appReducer(state, getDataSucceeded({ hasAdmin: true, uuid: 'true' }))).toEqual(
        expected
      );
    });
  });
});
