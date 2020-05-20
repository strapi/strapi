import { reducer } from '../reducer';

describe('ADMIN | CONTAINERS | USERS | EditPage | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const initialState = {
        test: true,
      };

      expect(reducer(initialState, {})).toEqual(initialState);
    });
  });

  describe('ON_CANCEL', () => {
    it('should set the modifiedData with the initialData', () => {
      const initialState = {
        initialData: {
          email: 'john@strapi.io',
          firstname: '',
        },
        modifiedData: {
          email: 'john@strapi.io',
          firstname: 'test',
        },
      };
      const action = {
        type: 'ON_CANCEL',
      };
      const expected = {
        initialData: {
          email: 'john@strapi.io',
          firstname: '',
        },
        modifiedData: {
          email: 'john@strapi.io',
          firstname: '',
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('should change the data correctly if the inputType is not password', () => {
      const initialState = {
        modifiedData: {
          email: 'john@strapi.io',
          firstname: null,
        },
      };
      const action = {
        type: 'ON_CHANGE',
        keys: 'email',
        inputType: 'email',
        value: 'test123',
      };
      const expected = {
        modifiedData: {
          email: 'test123',
          firstname: null,
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should change the data correctly if the inputType is password', () => {
      const initialState = {
        modifiedData: {
          email: 'john@strapi.io',
          password: 'pwd123',
        },
      };
      const action = {
        type: 'ON_CHANGE',
        keys: 'password',
        inputType: 'password',
        value: 'pwd1234',
      };
      const expected = {
        modifiedData: {
          email: 'john@strapi.io',
          password: 'pwd1234',
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should change the data correctly if the inputType is password and the value is empty', () => {
      const initialState = {
        modifiedData: {
          email: 'john@strapi.io',
          password: 'pwd123',
        },
      };
      const action = {
        type: 'ON_CHANGE',
        keys: 'password',
        inputType: 'password',
        value: '',
      };
      const expected = {
        modifiedData: {
          email: 'john@strapi.io',
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should set the username value to null if the value is empty', () => {
      const initialState = {
        modifiedData: {
          email: 'john@strapi.io',
          password: 'pwd123',
          username: 'test',
        },
      };
      const action = {
        type: 'ON_CHANGE',
        keys: 'username',
        inputType: 'text',
        value: '',
      };
      const expected = {
        modifiedData: {
          email: 'john@strapi.io',
          password: 'pwd123',
          username: null,
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_SUBMIT', () => {
    it('should change the showHeaderLoader property to true', () => {
      const initialState = {
        initialData: {},
        modifiedData: {},
        isLoading: false,
        showHeaderLoader: false,
      };
      const expected = {
        initialData: {},
        modifiedData: {},
        isLoading: false,
        showHeaderLoader: true,
      };

      const action = {
        type: 'ON_SUBMIT',
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
