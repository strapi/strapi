import { createSelector } from 'reselect';
import pluginId from 'pluginId';

/**
 * Direct selector to the form state domain
 */
const selectFormDomain = () => state => state.get(`${pluginId}_form`);

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

const makeSelectDidFetchModel = () => createSelector(
  selectFormDomain(),
  (substate) => substate.get('didFetchModel'),
);

const makeSelectShouldRefetchContentType = () => createSelector(
  selectFormDomain(),
  (substate) => substate.get('shouldRefetchContentType'),
);

const makeSelectContentTypeUpdated = () => createSelector(
  selectFormDomain(),
  (substate) => substate.get('updatedContentType'),
);

export default selectForm;
export {
  selectFormDomain,
  makeSelectDidFetchModel,
  makeSelectInitialDataEdit,
  makeSelectModifiedData,
  makeSelectModifiedDataEdit,
  makeSelectShouldRefetchContentType,
  makeSelectContentTypeUpdated,
};
