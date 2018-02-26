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

export default selectConfigPage;
