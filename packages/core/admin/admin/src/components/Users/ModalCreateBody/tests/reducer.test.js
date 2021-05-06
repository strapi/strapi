import { reducer } from '../reducer';

describe('ADMIN | COMPONENTS | USERS | MODALCREATEBODY | reducer', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      IS_EE: false,
      'process.env.STRAPI_ADMIN_ENABLED_EE_FEATURES': [],
      STRAPI_ADMIN_ENABLED_EE_FEATURES: [],
    };
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });
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
          firstname: 'kai',
          lastname: '',
          email: 'kai@strapi.io',
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
          firstname: 'kai',
          lastname: 'doe',
          email: 'kai@strapi.io',
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
