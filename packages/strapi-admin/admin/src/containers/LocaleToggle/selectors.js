import { createSelector } from 'reselect';

/**
 * Direct selector to the localeToggle state domain
 */
const selectLocaleToggle = () => state => state.get('localeToggle');

/**
 * Other specific selectors
 */

/**
 * Default selector used by LocaleToggle
 */

const makeSelectLocaleToggle = () =>
  createSelector(
    selectLocaleToggle(),
    substate => {
      return substate ? substate.toJS() : substate;
    }
  );

export default makeSelectLocaleToggle;
export { selectLocaleToggle };
