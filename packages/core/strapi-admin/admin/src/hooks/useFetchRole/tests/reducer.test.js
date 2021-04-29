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
        role: {},
        permissions: {},
        isLoading: true,
      };
      const expected = {
        role: {},
        permissions: {},
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
          name: 'Super admin',
          description: 'This is the super admin role',
        },
        permissions: [
          {
            action: 'plugins::content-manager.explorer.read',
            conditions: [],
            fields: ['name', 'addresses'],
            id: 3,
            role: 12,
            subject: 'application::category.category',
          },
          {
            action: 'plugins::content-manager.explorer.delete',
            conditions: [],
            fields: [],
            id: 4,
            role: 12,
            subject: 'application::category.category',
          },
        ],
      };
      const initialState = {
        role: {},
        permissions: {},
        isLoading: true,
      };
      const expected = {
        role: {
          id: 1,
          name: 'Super admin',
          description: 'This is the super admin role',
        },
        permissions: [
          {
            action: 'plugins::content-manager.explorer.read',
            conditions: [],
            fields: ['name', 'addresses'],
            id: 3,
            role: 12,
            subject: 'application::category.category',
          },
          {
            action: 'plugins::content-manager.explorer.delete',
            conditions: [],
            fields: [],
            id: 4,
            role: 12,
            subject: 'application::category.category',
          },
        ],
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
