import { createSelector } from 'reselect';
import pluginId from '../../pluginId';

/**
 * Direct selector to the modelPage state domain
 */
const selectModelPageDomain = () => (state) => state.get(`${pluginId}_modelPage`);

/**
 * Other specific selectors
 */


/**
 * Default selector used by ModelPage
 */

const makeSelectModelPage = () => createSelector(
  selectModelPageDomain(),
  (substate) => substate.toJS()
);

export default makeSelectModelPage;
export {
  selectModelPageDomain,
};
