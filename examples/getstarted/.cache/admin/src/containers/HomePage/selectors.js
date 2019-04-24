import { createSelector } from 'reselect';

/**
 * Direct selector to the homePage state domain
 */
const selectHomePageDomain = () => (state) => state.get('homePage');

/**
 * Other specific selectors
 */


/**
 * Default selector used by HomePage
 */

const makeSelectHomePage = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.toJS(),
);

const makeSelectBody = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.get('body').toJS(),
);


export default makeSelectHomePage;
export {
  makeSelectBody,
  selectHomePageDomain,
};
