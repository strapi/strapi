import { reducer, Action, InitialState } from '../reducer';

describe('SettingsPage | reducer', () => {
  describe('GET_DATA_SUCCEEDED', () => {
    it('should set the modifiedData and the initialData correctly', () => {
      const action: Action = {
        type: 'GET_DATA_SUCCEEDED',
        data: {
          responsiveDimensions: true,
          sizeOptimization: true,
          autoOrientation: false,
          videoPreview: false,
        },
      };
      const state: InitialState = {
        initialData: null,
        modifiedData: null,
      };
      const expected = {
        initialData: {
          responsiveDimensions: true,
          sizeOptimization: true,
          autoOrientation: false,
          videoPreview: false,
        },
        modifiedData: {
          responsiveDimensions: true,
          sizeOptimization: true,
          autoOrientation: false,
          videoPreview: false,
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('should update the modifiedData correctly', () => {
      const action: Action = {
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
