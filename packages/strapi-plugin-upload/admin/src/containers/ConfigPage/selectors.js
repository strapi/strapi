import { createSelector } from 'reselect';

/**
 * Direct selector to the configPage state domain
 */
const selectConfigPageDomain = () => state => state.get('configPage');

/**
 * Default selector used by ConfigPage
 */

const selectConfigPage = () => createSelector(
  selectConfigPageDomain(),
  (substate) => substate.toJS(),
);

const makeSelectEnv = () => createSelector(
  selectConfigPageDomain(),
  (substate) => substate.get('env'),
);

const makeSelectModifiedData = () => createSelector(
  selectConfigPageDomain(),
  (substate) => substate.get('modifiedData').toJS(),
);

export default selectConfigPage;
export {
  makeSelectEnv,
  makeSelectModifiedData,
};
