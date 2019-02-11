import { createSelector } from 'reselect';

/**
 * Direct selector to the homePage state domain
 */
const selectHomePageDomain = () => state => state.get('content-type-builder-homePage');

/**
 * Other specific selectors
 */


/**
 * Default selector used by HomePage
 */

const selectHomePage = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.toJS()
);

export default selectHomePage;
export {
  selectHomePageDomain,
};
