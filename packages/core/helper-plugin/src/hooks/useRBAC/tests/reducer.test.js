import reducer from '../reducer';

describe('HELPER_PLUGIN | hooks | useRBAC | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const initialState = {
        ok: true,
      };

      expect(reducer(initialState, { type: '' })).toEqual(initialState);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should set the data correctly', () => {
      const initialState = {
        isLoading: true,
        allowedActions: {},
      };
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: {
          canRead: false,
        },
      };
      const expected = {
        allowedActions: {
          canRead: false,
        },
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
