import { createSelector } from 'reselect';

/**
 * Direct selector to the editPage state domain
 */
const selectEditPageDomain = () => (state) => state.get('editPage');

/**
 * Other specific selectors
 */


/**
 * Default selector used by EditPage
 */

const makeSelectEditPage = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.toJS(),
);

const makeSelectActionType = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.get('actionType'),
);

const makeSelectModifiedData = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.get('modifiedData').toJS(),
);

export default makeSelectEditPage;
export {
  makeSelectActionType,
  makeSelectModifiedData,
  selectEditPageDomain,
};
