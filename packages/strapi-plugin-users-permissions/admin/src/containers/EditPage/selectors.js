import { createSelector } from 'reselect';
import pluginId from 'pluginId';

/**
 * Direct selector to the editPage state domain
 */
const selectEditPageDomain = () => (state) => state.get(`${pluginId}_editPage`);

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

const makeSelectRoleId = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.get('roleId'),
);

export default makeSelectEditPage;
export {
  makeSelectActionType,
  makeSelectModifiedData,
  makeSelectRoleId,
  selectEditPageDomain,
};
