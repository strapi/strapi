import reducer from '../reducer';

describe('MEDIA LIBRARY | pages | SettingsPage | reducer', () => {
  describe('CANCEL_CHANGES', () => {
    it('should set the modifiedData with the initialData', () => {
      const action = {
        type: 'CANCEL_CHANGES',
      };
      const state = {
        initialData: 'test',
        modifiedData: 'new test',
      };
      const expected = {
        initialData: 'test',
        modifiedData: 'test',
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should set the modifiedData and the initialData correctly', () => {
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: { test: true },
      };
      const state = {
        initialData: null,
        isLoading: true,
        modifiedData: null,
      };
      const expected = {
        initialData: { test: true },
        isLoading: false,
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
        isLoading: false,
        modifiedData: {
          responsiveDimensions: true,
        },
      };
      const expected = {
        initialData: { responsiveDimensions: true },
        isLoading: false,
        modifiedData: { responsiveDimensions: false },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SUBMIT_SUCCEEDED', () => {
    it('should set the initialData with the modifiedData correctly', () => {
      const action = {
        type: 'SUBMIT_SUCCEEDED',
      };
      const state = {
        initialData: {
          responsiveDimensions: true,
        },
        isLoading: false,
        isSubmiting: true,
        modifiedData: {
          responsiveDimensions: false,
        },
      };
      const expected = {
        initialData: { responsiveDimensions: false },
        isLoading: false,
        isSubmiting: false,
        modifiedData: { responsiveDimensions: false },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
