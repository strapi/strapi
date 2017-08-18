/*
 *
 * LanguageProvider reducer
 *
 */

import { fromJS } from 'immutable';
import {
  CHANGE_LOCALE,
} from './constants';

const initialState = fromJS({
  locale: 'en',
});

function languageProviderReducer(state = initialState, action) {
  switch (action.type) {
    case CHANGE_LOCALE:
      return state
        .set('locale', action.locale);
    default:
      return state;
  }
}

export default languageProviderReducer;
