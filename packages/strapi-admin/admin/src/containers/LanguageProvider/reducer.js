/*
 *
 * LanguageProvider reducer
 *
 */

import { fromJS } from 'immutable';
import { get, includes, split } from 'lodash';

// Import supported languages from the translations folder
import trads from '../../translations';
import { CHANGE_LOCALE } from './constants';

const languages = Object.keys(trads);

// Define a key to store and get user preferences in local storage.
const localStorageKey = 'strapi-admin-language';

// Detect user language.
const userLanguage =
  window.localStorage.getItem(localStorageKey) ||
  window.navigator.language ||
  window.navigator.userLanguage;

let foundLanguage = includes(languages, userLanguage) && userLanguage;

if (!foundLanguage) {
  // Split user language in a correct format.
  const userLanguageShort = get(split(userLanguage, '-'), '0');

  // Check that the language is included in the admin configuration.
  foundLanguage = includes(languages, userLanguageShort) && userLanguageShort;
}

const initialState = fromJS({
  locale: foundLanguage || 'en',
});

function languageProviderReducer(state = initialState, action) {
  switch (action.type) {
    case CHANGE_LOCALE:
      // Set user language in local storage.
      window.localStorage.setItem(localStorageKey, action.locale);
      strapi.currentLanguage = action.locale;

      return state.set('locale', action.locale);
    default:
      return state;
  }
}

export default languageProviderReducer;
