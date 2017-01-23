import { createSelector } from 'reselect';

/**
 * Direct selector to the list state domain
 */
const selectListDomain = () => state => state.get('list');

/**
 * Other specific selectors
 */


/**
 * Default selector used by List
 */

const makeSelectModelRecords = () => createSelector(
  selectListDomain(),
  (substate) => {
    const model = substate.get('currentModel');
    return substate.getIn(['models', model]);
  }
);

const makeSelectLoading = () => createSelector(
  selectListDomain(),
  (substate) => substate.get('loading')
);

export {
  selectListDomain,
  makeSelectLoading,
  makeSelectModelRecords
};
