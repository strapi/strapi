import reducer from '../reducer';

describe('SettingsPage | reducer', () => {
  describe('GET_DATA_SUCCEEDED', () => {
    it('should set the modifiedData and the initialData correctly', () => {
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: { test: true },
      };
      const state = {
        initialData: null,
        modifiedData: null,
      };
      const expected = {
        initialData: { test: true },
        modifiedData: { test: true },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('should update the modifiedData correctly', () => {
      const action = {
        type: 'ON_CHANGE',
        keys: 'responsiveDimensions',
        value: false,
      };
      const state = {
        initialData: {
          responsiveDimensions: true,
        },
        modifiedData: {
          responsiveDimensions: true,
        },
      };
      const expected = {
        initialData: { responsiveDimensions: true },
        modifiedData: { responsiveDimensions: false },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
