import { createSelector } from 'reselect';

/**
 * Direct selector to the onboarding state domain
 */
const selectOnboardingDomain = () => (state) => state.get('onboarding');

/**
 * Other specific selectors
 */


/**
 * Default selector used by Onboarding
 */

const makeSelectOnboarding = () => createSelector(
  selectOnboardingDomain(),
  (substate) => substate.toJS()
);

export default makeSelectOnboarding;
export {
  selectOnboardingDomain,
};
