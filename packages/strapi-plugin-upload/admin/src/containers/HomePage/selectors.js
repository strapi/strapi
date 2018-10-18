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

const makeSelectParams = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.get('params').toJS(),
);

const makeSelectSearch = () => createSelector(
  selectHomePageDomain(),
  (substate) => substate.get('search'),
);

export default selectHomePage;
export {
  makeSelectSearch,
  makeSelectParams,
};
