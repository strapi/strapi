import { reducer } from '../reducer';

describe('ADMIN | COMPONENTS | USERS | FilterPicker | Card | reducer', () => {
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
          name: 'firstname',
          filter: '',
          value: '',
        },
        test: true,
      };
      const action = {
        type: 'ON_CHANGE',
        keys: 'filter',
        value: '_ne',
      };
      const expected = {
        modifiedData: {
          name: 'firstname',
          filter: '_ne',
          value: '',
        },
        test: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_NAME', () => {
    it('should change the data correctly', () => {
      const initialState = {
        modifiedData: {
          name: 'firstname',
          filter: '_ne',
          value: 'test',
        },
        test: true,
      };
      const action = {
        type: 'ON_CHANGE_NAME',
        keys: 'name',
        value: 'isActive',
      };
      const expected = {
        modifiedData: {
          name: 'isActive',
          filter: '',
          value: true,
        },
        test: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('RESET_FORM', () => {
    it('should reset the form correctly', () => {
      const action = {
        type: 'RESET_FORM',
      };
      const initialState = {
        test: true,
        modifiedData: {
          ok: true,
        },
      };
      const expected = {
        modifiedData: {
          name: 'firstname',
          filter: '',
          value: '',
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
