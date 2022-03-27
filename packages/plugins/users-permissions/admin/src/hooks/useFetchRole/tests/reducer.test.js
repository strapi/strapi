import reducer from '../reducer';

describe('USERS PERMISSIONS | HOOKS | useFetchRole | reducer', () => {
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
        role: {},
        isLoading: true,
      };
      const expected = {
        role: {},
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should return the state with the data', () => {
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        role: {
          id: 1,
          name: 'Authenticated',
          description: 'This is the Authenticated role',
          permissions: {},
        },
      };
      const initialState = {
        role: {},
        isLoading: true,
      };
      const expected = {
        role: {
          id: 1,
          name: 'Authenticated',
          description: 'This is the Authenticated role',
          permissions: {},
        },
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_SUBMIT_SUCCEEDED', () => {
    it("should set the role's name and description correctly", () => {
      const state = {
        role: {
          id: 1,
          name: 'Authenticated',
          description: 'This is the Authenticated role',
          permissions: {},
        },
      };

      const action = {
        type: 'ON_SUBMIT_SUCCEEDED',
        name: 'Public',
        description: 'test',
      };

      const expected = {
        role: {
          id: 1,
          name: 'Public',
          description: 'test',
          permissions: {},
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
