import reducer from '../reducer';

describe('ADMIN | HOOKS | USEFETCHROLE | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('GET_DATA_ERROR', () => {
    it('should set isLoading to false is an error occured', () => {
      const action = {
        type: 'GET_DATA_ERROR',
      };
      const initialState = {
        data: [],
        isLoading: true,
      };
      const expected = {
        data: [],
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should return the state with the data', () => {
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: [
          {
            uid: 'provider1',
            displayName: 'Provider 1',
            icon: 'icon1',
          },
          {
            uid: 'provider2',
            displayName: 'Provider 2',
            icon: 'icon2',
          },
        ],
      };
      const initialState = {
        data: [],
        isLoading: true,
      };
      const expected = {
        data: [
          {
            uid: 'provider1',
            displayName: 'Provider 1',
            icon: 'icon1',
          },
          {
            uid: 'provider2',
            displayName: 'Provider 2',
            icon: 'icon2',
          },
        ],
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
