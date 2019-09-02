import {
  emitEvent,
  getInitData,
  getInitDataSucceeded,
  hideLeftMenu,
  setAppError,
  setAppSecured,
  showLeftMenu,
  unsetAppSecured,
} from '../actions';
import {
  EMIT_EVENT,
  GET_INIT_DATA,
  GET_INIT_DATA_SUCCEEDED,
  HIDE_LEFT_MENU,
  SET_APP_ERROR,
  SET_APP_SECURED,
  SHOW_LEFT_MENU,
  UNSET_APP_SECURED,
} from '../constants';

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

  describe('GetInitData Action', () => {
    it('has a type of GET_INIT_DATA', () => {
      const expected = {
        type: GET_INIT_DATA,
      };

      expect(getInitData()).toEqual(expected);
    });
  });

  describe('GetInitDataSucceeded Action', () => {
    it('should return the correct type and the passed data', () => {
      const data = { autoReload: true };
      const expected = {
        type: GET_INIT_DATA_SUCCEEDED,
        data,
      };

      expect(getInitDataSucceeded(data)).toEqual(expected);
    });
  });

  describe('HideLeftMenu Action', () => {
    it('has a type of HIDE_LEFT_MENU', () => {
      const expected = {
        type: HIDE_LEFT_MENU,
      };

      expect(hideLeftMenu()).toEqual(expected);
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

  describe('SetAppSecured Action', () => {
    it('has a type of SET_APP_SECURED', () => {
      const expected = {
        type: SET_APP_SECURED,
      };

      expect(setAppSecured()).toEqual(expected);
    });
  });

  describe('ShowLeftMenu Action', () => {
    it('has a type of SHOW_LEFT_MENU', () => {
      const expected = {
        type: SHOW_LEFT_MENU,
      };

      expect(showLeftMenu()).toEqual(expected);
    });
  });

  describe('UnsetAppSecured Action', () => {
    it('has a type of UNSET_APP_SECURED', () => {
      const expected = {
        type: UNSET_APP_SECURED,
      };

      expect(unsetAppSecured()).toEqual(expected);
    });
  });
});
