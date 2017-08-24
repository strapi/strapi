import { createSelector } from 'reselect';

/**
 * Direct selector to the form state domain
 */
const selectFormDomain = () => state => state.get('form');

/**
 * Other specific selectors
 */


/**
 * Default selector used by Form
 */

const selectForm = () => createSelector(
  selectFormDomain(),
  (substate) => substate.toJS(),
);

const makeSelectModifiedData = () => createSelector(
  selectFormDomain(),
  (substate) => substate.get('modifiedData').toJS(),
);

const makeSelectModifiedDataEdit = () => createSelector(
  selectFormDomain(),
  (substate) => substate.get('modifiedDataEdit').toJS(),
);

const makeSelectInitialDataEdit = () => createSelector(
  selectFormDomain(),
  (substate) => substate.get('initialDataEdit').toJS()
);

export default selectForm;
export {
  selectFormDomain,
  makeSelectInitialDataEdit,
  makeSelectModifiedData,
  makeSelectModifiedDataEdit,
};
