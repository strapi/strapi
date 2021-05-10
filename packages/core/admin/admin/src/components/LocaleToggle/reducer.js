/*
 *
 * LocaleToggle reducer
 *
 */

import { fromJS } from 'immutable';
import { RESET_DEFAULT_CLASSNAME, SET_CUSTOM_CLASSNAME } from './constants';

const initialState = fromJS({
  className: null,
});

function localeToggleReducer(state = initialState, action) {
  switch (action.type) {
    case RESET_DEFAULT_CLASSNAME:
      return state.update('className', () => initialState.get('className'));
    case SET_CUSTOM_CLASSNAME:
      return state.update('className', () => action.className);
    default:
      return state;
  }
}

export default localeToggleReducer;
