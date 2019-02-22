/**
 *
 * EditPage selectors
 *
 */

import { createSelector } from 'reselect';
import pluginId from 'pluginId';

/**
* Direct selector to the listPage state domain
*/
const selectEditPageDomain = () => state => state.get(`${pluginId}_editPage`);


/**
 * Default selector used by EditPage
 */

const makeSelectEditPage = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.toJS()
);

/**
 *
 * Other specific selectors
 */
const makeSelectFileRelations = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.get('fileRelations').toJS(),
);

const makeSelectIsCreating = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.get('isCreating'),
);

const makeSelectModelName = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.get('modelName'),
);

const makeSelectRecord = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.get('record').toJS(),
);

const makeSelectSource = () => createSelector(
  selectEditPageDomain(),
  (substate) => substate.get('source'),
);

export default makeSelectEditPage;
export {
  makeSelectFileRelations,
  makeSelectIsCreating,
  makeSelectModelName,
  makeSelectRecord,
  makeSelectSource,
  selectEditPageDomain,
};
