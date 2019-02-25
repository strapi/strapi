import { createSelector } from 'reselect';
import pluginId from '../../pluginId';

/**
 * Direct selector to the modelPage state domain
 */
const selectModelPageDomain = () => state => state.get(`${pluginId}_modelPage`);

/**
 * Other specific selectors
 */


/**
 * Default selector used by ModelPage
 */

const selectModelPage = () => createSelector(
  selectModelPageDomain(),
  (substate) => substate.toJS()
);

const makeSelectModel = () => createSelector(
  selectModelPageDomain(),
  (substate) => substate.get('model').toJS(),
);

const makeSelectPostContentTypeSuccess = () => createSelector(
  selectModelPageDomain(),
  (substate) => substate.get('postContentTypeSuccess'),
);

export default selectModelPage;
export {
  selectModelPageDomain,
  makeSelectModel,
  makeSelectPostContentTypeSuccess,
};
