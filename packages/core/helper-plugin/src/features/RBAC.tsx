import * as React from 'react';

import type { Entity } from '@strapi/types';
import type { QueryObserverBaseResult } from 'react-query';

/**
 * This is duplicated from the `@strapi/admin` package.
 */
interface Permission {
  id: Entity.ID;
  action: string;
  actionParameters: object;
  subject?: string | null;
  properties: {
    fields?: string[];
    locales?: string[];
    [key: string]: any;
  };
  conditions: string[];
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

export type RBACContextValue = {
  allPermissions: Permission[]; // The permissions of the current user.
  refetchPermissions: QueryObserverBaseResult<Permission[]>['refetch'];
};

const RBACContext = React.createContext<RBACContextValue>({
  allPermissions: [],
  refetchPermissions: async () => {
    throw new Error('RBACContext: refetchPermissions() not implemented');
  },
});

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
