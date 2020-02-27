import { fromJS } from 'immutable';
import reducer from '../reducer';

describe('UPLOAD | components | UploadForm ', () => {
  describe('reducer', () => {
    it('should return the initialState', () => {
      const action = {
        type: 'TEST',
      };
      const initialState = { test: true };

      expect(reducer(initialState, action)).toEqual(initialState);
    });

    it('should change the tab', () => {
      const initialState = fromJS({
        to: 'computer',
      });
      const action = {
        type: 'SET_TAB',
        to: 'test',
      };
      const expected = fromJS({
        to: 'test',
      });

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
