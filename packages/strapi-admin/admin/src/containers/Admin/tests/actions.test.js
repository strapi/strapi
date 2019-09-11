import { emitEvent, setAppError } from '../actions';
import { EMIT_EVENT, SET_APP_ERROR } from '../constants';

describe('<Admin /> actions', () => {
  describe('EmitEvent', () => {
    it('has a type EMIT_EVENT and returns the correct data', () => {
      const expected = {
        type: EMIT_EVENT,
        event: 'test',
        properties: {},
      };

      expect(emitEvent('test', {})).toEqual(expected);
    });
  });

  describe('SetAppError Action', () => {
    it('has a type of SET_APP_ERROR', () => {
      const expected = {
        type: SET_APP_ERROR,
      };

      expect(setAppError()).toEqual(expected);
    });
  });
});
