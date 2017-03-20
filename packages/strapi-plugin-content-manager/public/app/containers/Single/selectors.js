import { createSelector } from 'reselect';

/**
 * Direct selector to the single state domain
 */
const selectSingleDomain = () => state => state.get('single');

/**
 * Other specific selectors
 */


/**
 * Default selector used by Single
 */

const makeSelectRecord = () => createSelector(
  selectSingleDomain(),
  (substate) => {
    return substate.get('record');
  }
);

const makeSelectLoading = () => createSelector(
  selectSingleDomain(),
  (substate) => substate.get('loading')
);

const makeSelectCurrentModel = () => createSelector(
  selectSingleDomain(),
  (substate) => substate.get('currentModel')
);

export default selectSingleDomain;
export {
  makeSelectRecord,
  makeSelectLoading,
  makeSelectCurrentModel,
};
