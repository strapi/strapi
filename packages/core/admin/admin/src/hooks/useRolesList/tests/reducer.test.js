import reducer from '../reducer';

describe('ADMIN | HOOKS | USEROLESLIST | reducer', () => {
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
      };
      const initialState = {
        roles: [],
        isLoading: true,
      };
      const expected = {
        roles: [],
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
            name: 'Super admin',
            description: 'This is the super admin role',
          },
        ],
      };
      const initialState = {
        roles: [],
        isLoading: true,
      };
      const expected = {
        roles: [
          {
            id: 1,
            name: 'Super admin',
            description: 'This is the super admin role',
          },
        ],
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
