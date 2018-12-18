import { createSelector } from 'reselect';

/**
 * Direct selector to the homePage state domain
 */
const selectHomePageDomain = () => state => state.get('homePage');

/**
 * Default selector used by HomePage
 */

const selectHomePage = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.toJS(),
);

const makeSelectForm = () => createSelector(
  selectHomePageDomain(),
  substate => substate.get('form').toJS(),
);

const makeSelectPrefix = () => createSelector(
  selectHomePageDomain(),
  substate => substate.get('prefix'),
);

const makeSelectVersionToDelete = () => createSelector(
  selectHomePageDomain(),
  substate => substate.get('versionToDelete'),
);

export default selectHomePage;
export { makeSelectForm, makeSelectVersionToDelete, makeSelectPrefix };