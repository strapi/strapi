import { createSelector } from 'reselect';

/**
 * Direct selector to the localeToggle state domain
 */
const selectLocaleToggle = () => (state) => state.get('localeToggle');

/**
 * Other specific selectors
 */


/**
 * Default selector used by LocaleToggle
 */

const makeSelectLocaleToggle = () => createSelector(
  selectLocaleToggle(),
  (substate) => substate.toJS()
);

export default makeSelectLocaleToggle;
export {
  selectLocaleToggle,
};
