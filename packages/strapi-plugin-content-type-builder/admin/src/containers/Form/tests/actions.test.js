import expect from 'expect';
import {
  setForm,
} from '../actions';
import {
  SET_FORM,
} from '../constants';

describe('Form actions', () => {
  describe('SetForm Action', () => {
    it('has a type of SET_FORM', () => {
      const expected = {
        type: SET_FORM,
      };
      expect(setForm()).toEqual(expected);
    });
  });
});
