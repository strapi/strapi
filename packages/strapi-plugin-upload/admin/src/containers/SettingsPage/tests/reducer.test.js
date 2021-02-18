import { fromJS } from 'immutable';
import reducer from '../reducer';

describe('MEDIA LIBRARY | containers | SettingsPage | reducer', () => {
  describe('CANCEL_CHANGES', () => {
    it('should set the modifiedData with the initialData', () => {
      const action = {
        type: 'CANCEL_CHANGES',
      };
      const state = fromJS({
        initialData: 'test',
        modifiedData: 'new test',
      });
      const expected = fromJS({
        initialData: 'test',
        modifiedData: 'test',
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should set the modifiedData and the initialData correctly', () => {
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: { test: true },
      };
      const state = fromJS({
        initialData: null,
        isLoading: true,
        modifiedData: null,
      });
      const expected = fromJS({
        initialData: { test: true },
        isLoading: false,
        modifiedData: { test: true },
      });

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
      const state = fromJS({
        initialData: {
          responsiveDimensions: true,
        },
        isLoading: false,
        modifiedData: {
          responsiveDimensions: true,
        },
      });
      const expected = fromJS({
        initialData: { responsiveDimensions: true },
        isLoading: false,
        modifiedData: { responsiveDimensions: false },
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SUBMIT_SUCCEEDED', () => {
    it('should set the initialData with the modifiedData correctly', () => {
      const action = {
        type: 'SUBMIT_SUCCEEDED',
      };
      const state = fromJS({
        initialData: {
          responsiveDimensions: true,
        },
        isLoading: false,
        modifiedData: {
          responsiveDimensions: false,
        },
      });
      const expected = fromJS({
        initialData: { responsiveDimensions: false },
        isLoading: false,
        modifiedData: { responsiveDimensions: false },
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
