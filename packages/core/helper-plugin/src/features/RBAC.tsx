import * as React from 'react';

interface Permission {
  action: string;
  conditions: unknown[];
  id: number;
  properties: Record<string, unknown>;
  subject: string | null;
}

type RefetchPermissionsFn = import('react-query').QueryObserverBaseResult<Permission[]>['refetch'];

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

type RBACContextValue = {
  allPermissions: Permission[]; // The permissions of the current user.
  refetchPermissions: RefetchPermissionsFn;
};

const RBACContext: React.Context<RBACContextValue> = React.createContext({} as RBACContextValue);

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

const useRBAC = () => React.useContext(RBACContext);

const useRBACProvider = useRBAC;

export { RBACContext, RBACProviderContext, useRBACProvider, Permission };
