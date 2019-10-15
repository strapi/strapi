/**
 * 
 * LocaleToggle actions
 */

import {
  RESET_DEFAULT_CLASSNAME,
  SET_CUSTOM_CLASSNAME,
} from './constants';

export function resetLocaleDefaultClassName() {
  return {
    type: RESET_DEFAULT_CLASSNAME,
  };
}

export function setLocaleCustomClassName(className) {
  return {
    type: SET_CUSTOM_CLASSNAME,
    className,
  };
}
