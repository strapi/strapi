import reducer from '../reducer';
import type { GetDataSucceededAction, OnChangeAction } from '../reducer';

describe('SettingsPage | reducer', () => {
  describe('GET_DATA_SUCCEEDED', () => {
    it('should set the modifiedData and the initialData correctly', () => {
      const action: GetDataSucceededAction = {
        type: 'GET_DATA_SUCCEEDED',
        data: {
          sizeOptimization: false,
          responsiveDimensions: true,
          autoOrientation: true,
          videoPreview: false,
        },
      };
      const state = {
        initialData: {
          sizeOptimization: false,
          responsiveDimensions: false,
          autoOrientation: false,
          videoPreview: false,
        },
        modifiedData: {
          sizeOptimization: false,
          responsiveDimensions: false,
          autoOrientation: false,
          videoPreview: false,
        },
      };
      const expected = {
        initialData: {
          sizeOptimization: false,
          responsiveDimensions: true,
          autoOrientation: true,
          videoPreview: false,
        },
        modifiedData: {
          sizeOptimization: false,
          responsiveDimensions: true,
          autoOrientation: true,
          videoPreview: false,
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('should update the modifiedData correctly', () => {
      const action: OnChangeAction = {
        type: 'ON_CHANGE',
        keys: 'responsiveDimensions',
        value: false,
      };
      const state = {
        initialData: {
          sizeOptimization: false,
          responsiveDimensions: true,
          autoOrientation: true,
          videoPreview: false,
        },
        modifiedData: {
          sizeOptimization: false,
          responsiveDimensions: true,
          autoOrientation: true,
          videoPreview: false,
        },
      };
      const expected = {
        initialData: {
          sizeOptimization: false,
          responsiveDimensions: true,
          autoOrientation: true,
          videoPreview: false,
        },
        modifiedData: {
          sizeOptimization: false,
          responsiveDimensions: false,
          autoOrientation: true,
          videoPreview: false,
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
