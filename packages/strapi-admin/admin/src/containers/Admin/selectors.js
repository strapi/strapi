import { createSelector } from 'reselect';

/**
 * Direct selector to the admin state domain
 */
const selectAdminDomain = () => state => state.get('admin');

/**
 * Other specific selectors
 */

/**
 * Default selector used by Admin
 */

const makeSelectAdmin = () =>
  createSelector(selectAdminDomain(), substate => substate.toJS());

const makeSelectPluginsFromMarketplace = () =>
  createSelector(selectAdminDomain(), substate =>
    substate.get('pluginsFromMarketplace').toJS()
  );

const makeSelectUuid = () =>
  createSelector(selectAdminDomain(), substate => substate.get('uuid'));

export default makeSelectAdmin;
export { makeSelectUuid, selectAdminDomain, makeSelectPluginsFromMarketplace };
