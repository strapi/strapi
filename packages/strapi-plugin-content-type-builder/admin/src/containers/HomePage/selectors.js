import { createSelector } from 'reselect';

/**
 * Direct selector to the homePage state domain
 */
const selectHomePageDomain = () => state => state.get('homePage');

/**
 * Default selector used by HomePage
 */

const makeSelectLoading = () =>
  createSelector(selectHomePageDomain(), substate => substate.get('loading'));

const makeSelectData = () =>
  createSelector(selectHomePageDomain(), substate => substate.get('data'));

export { makeSelectLoading, makeSelectData };
