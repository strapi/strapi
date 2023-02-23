import reducer from '../reducer';

describe('ADMIN | HOOKS | useFetchPermissionsLayout | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('GET_DATA_ERROR', () => {
    it('should set isLoading to false is an error occurred', () => {
      const action = {
        type: 'GET_DATA_ERROR',
        error: {
          message: 'error',
        },
      };
      const initialState = {
        data: {},
        error: null,
        isLoading: true,
      };
      const expected = {
        data: {},
        error: { message: 'error' },
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('GET_DATA', () => {
    it('should set isLoading to true ', () => {
      const action = {
        type: 'GET_DATA',
      };
      const initialState = {
        data: {
          ok: true,
        },
        error: true,
        isLoading: true,
      };
      const expected = {
        data: {},
        error: null,
        isLoading: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should return the state with the data', () => {
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: {
          ok: true,
        },
      };
      const initialState = {
        data: {},
        error: true,
        isLoading: true,
      };
      const expected = {
        data: {
          ok: true,
        },
        error: null,
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
