import * as React from 'react';

/**
 * @preserve
 * @typedef {Object} Permission
 * @property {string} action
 * @property {unknown[]} conditions
 * @property {number} id
 * @property {Record<string, unknown>} properties
 * @property {string} subject
 */

/**
 * @preserve
 * @typedef {import('react-query').QueryObserverBaseResult<Permission[]>['refetch']} RefetchPermissionsFn
 */

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @typedef {Object} RBACContextValue
 * @property {Permission[]} allPermissions – The permissions of the current user.
 * @property {RefetchPermissionsFn} refetchPermissions
 */

/**
 * @preserve
 * @type {React.Context<RBACContextValue>}
 */
const RBACContext = React.createContext();

/**
 * @deprecated Use RBACContext instead.
 */
const RBACProviderContext = RBACContext;

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

/**
 * TODO: in another iteration where we tackle the RBAC hooks // system to consolidate it all into one hook.
 */

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @returns {RBACContextValue}
 */
const useRBAC = () => React.useContext(RBACContext);

const useRBACProvider = useRBAC;

export { RBACContext, RBACProviderContext, useRBACProvider };
