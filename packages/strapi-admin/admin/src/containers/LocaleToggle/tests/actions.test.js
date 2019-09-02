import {
  resetLocaleDefaultClassName,
  setLocaleCustomClassName,
} from '../actions';
import {
  RESET_DEFAULT_CLASSNAME,
  SET_CUSTOM_CLASSNAME,
} from '../constants';

describe('<LocaleToggle /> actions', () => {
  describe('ResetLocaleDefaultClassName Action', () => {
    it('has a type of RESET_DEFAULT_CLASSNAME', () => {
      const expected = {
        type: RESET_DEFAULT_CLASSNAME,
      };

      expect(resetLocaleDefaultClassName()).toEqual(expected);
    });
  });

  describe('SetLocaleCustomClassName Action', () => {
    it('should return the correct type and the passed data', () => {
      const className = 'foo';
      const expected = {
        type: SET_CUSTOM_CLASSNAME,
        className,
      };

      expect(setLocaleCustomClassName(className)).toEqual(expected);
    });
  });
});
