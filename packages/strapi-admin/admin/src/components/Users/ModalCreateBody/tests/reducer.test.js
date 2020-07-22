import { reducer } from '../reducer';

describe('ADMIN | COMPONENTS | USERS | MODALCREATEBODY | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const initialState = {
        test: true,
      };

      expect(reducer(initialState, {})).toEqual(initialState);
    });
  });

  describe('ON_CHANGE', () => {
    it('should change the data correctly', () => {
      const initialState = {
        modifiedData: {
          firstname: 'john',
          lastname: '',
          email: 'john@strapi.io',
          roles: [1],
        },
        test: true,
      };
      const action = {
        type: 'ON_CHANGE',
        keys: 'lastname',
        value: 'doe',
      };
      const expected = {
        modifiedData: {
          firstname: 'john',
          lastname: 'doe',
          email: 'john@strapi.io',
          roles: [1],
        },
        test: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SET_ERRORS', () => {
    it('Should set the formErrors object correctly', () => {
      const action = {
        type: 'SET_ERRORS',
        errors: {
          test: 'this is required',
        },
      };
      const initialState = {
        formErrors: {},
        modifiedData: {
          ok: true,
        },
      };
      const expected = {
        formErrors: {
          test: 'this is required',
        },
        modifiedData: {
          ok: true,
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
