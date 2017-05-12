import { createSelector } from 'reselect';

/**
 * Direct selector to the languageToggle state domain
 */
const selectLanguage = () => state => state.get('language');

/**
 * Select the language locale
 */

const selectLocale = () => createSelector(
  selectLanguage(),
  (languageState) => languageState.get('locale')
);

export {
  selectLanguage,
  selectLocale,
};
