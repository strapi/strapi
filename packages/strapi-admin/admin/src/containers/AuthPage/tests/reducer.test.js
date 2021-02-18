import { reducer } from '../reducer';

describe('ADMIN | CONTAINERS | AUTH | reducer', () => {
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
          email: 'kai@strapi.io',
          password: null,
        },
      };
      const action = {
        type: 'ON_CHANGE',
        keys: 'password',
        value: 'test123',
      };
      const expected = {
        modifiedData: {
          email: 'kai@strapi.io',
          password: 'test123',
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('RESET_PROPS', () => {
    it('should return the initial state', () => {
      const action = {
        type: 'RESET_PROPS',
      };
      const state = {
        ok: true,
      };
      const expected = {
        formErrors: {},
        modifiedData: {},
        requestError: null,
      };

      expect(reducer(state, action)).toEqual(expected);
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

  describe('SET_REQUEST_ERROR', () => {
    it('Should set the requestError object correctly', () => {
      const action = {
        type: 'SET_REQUEST_ERROR',
        errorMessage: 'Invalid credentials',
        errorStatus: 400,
      };
      const initialState = {
        formErrors: {},
        modifiedData: {
          ok: true,
        },
        requestError: null,
      };
      const expected = {
        formErrors: {},
        modifiedData: {
          ok: true,
        },
        requestError: {
          errorMessage: 'Invalid credentials',
          errorStatus: 400,
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
