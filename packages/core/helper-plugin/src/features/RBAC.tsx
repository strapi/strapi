import * as React from 'react';

import type { Permission } from '@strapi/permissions';
import type { QueryObserverBaseResult } from 'react-query';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

type RBACContextValue = {
  allPermissions?: Permission[]; // The permissions of the current user.
  refetchPermissions?: QueryObserverBaseResult<Permission[]>;
};

const RBACContext: React.Context<RBACContextValue> = React.createContext({});

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
