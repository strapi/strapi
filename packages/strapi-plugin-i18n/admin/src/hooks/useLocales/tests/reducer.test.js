import reducer from '../reducer';

describe('USERS PERMISSIONS | HOOKS | USElocalesLIST | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('GET_DATA', () => {
    it('should set the isLoading key to true', () => {
      const state = {
        locales: [
          {
            id: 1,
            displayName: 'french',
            code: 'en-US',
          },
        ],
        isLoading: false,
      };

      const action = {
        type: 'GET_DATA',
      };

      const expected = {
        locales: [
          {
            id: 1,
            displayName: 'french',
            code: 'en-US',
          },
        ],
        isLoading: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_ERROR', () => {
    it('should set isLoading to false is an error occured', () => {
      const action = {
        type: 'GET_DATA_ERROR',
      };
      const initialState = {
        locales: [],
        isLoading: true,
      };
      const expected = {
        locales: [],
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should return the state with the role list', () => {
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: [
          {
            id: 1,
            displayName: 'french',
            code: 'en-US',
          },
        ],
      };
      const initialState = {
        locales: [],
        isLoading: true,
      };
      const expected = {
        locales: [
          {
            id: 1,
            displayName: 'french',
            code: 'en-US',
          },
        ],
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
