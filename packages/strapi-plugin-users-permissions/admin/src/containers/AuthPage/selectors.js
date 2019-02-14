import { createSelector } from 'reselect';
import pluginId from 'pluginId';

/**
 * Direct selector to the authPage state domain
 */
const selectAuthPageDomain = () => (state) => state.get(`${pluginId}_authPage`);

/**
 * Default selector used by AuthPage
 */

const makeSelectAuthPage = () => createSelector(
  selectAuthPageDomain(),
  (substate) => substate.toJS()
);

/**
 * Other specific selectors
 */

const makeSelectFormType = () => createSelector(
  selectAuthPageDomain(),
  (substate) => substate.get('formType'),
);

const makeSelectModifiedData = () => createSelector(
  selectAuthPageDomain(),
  (substate) => substate.get('modifiedData').toJS(),
);

export default makeSelectAuthPage;
export {
  makeSelectFormType,
  makeSelectModifiedData,
  selectAuthPageDomain,
};
