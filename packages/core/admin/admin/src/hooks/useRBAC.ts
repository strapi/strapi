import * as React from 'react';

import isEqual from 'lodash/isEqual';

import { getAdminUserId, useAuth, Permission } from '../features/Auth';
import { once } from '../utils/once';
import { capitalise } from '../utils/strings';

import { usePrev } from './usePrev';

type AllowedActions = Record<string, boolean>;

/**
 * @public
 * @description This hooks takes an object or array of permissions (the latter preferred) and
 * runs through them to match against the current user's permissions as well as the RBAC middleware
 * system checking any conditions that may be present. It returns the filtered permissions as the complete
 * object from the API and a set of actions that can be performed. An action is derived from the last part
 * of the permission action e.g. `admin::roles.create` would be `canCreate`. If there's a hyphen in the action
 * this is removed and capitalised e.g `admin::roles.create-draft` would be `canCreateDraft`.
 * @example
 * ```tsx
 * import { Page, useRBAC } from '@strapi/strapi/admin'
 *
 * const MyProtectedPage = () => {
 *  const { allowedActions, isLoading, error, permissions } = useRBAC([{ action: 'admin::roles.create' }])
 *
 *  if(isLoading) {
 *    return <Page.Loading />
 *  }
 *
 *  if(error){
 *    return <Page.Error />
 *  }
 *
 *  if(!allowedActions.canCreate) {
 *    return null
 *  }
 *
 *  return <MyPage permissions={permissions} />
 * }
 * ```
 */
const useRBAC = (
  permissionsToCheck: Record<string, Permission[]> | Permission[] = [],
  passedPermissions?: Permission[],
  rawQueryContext?: string
): {
  allowedActions: AllowedActions;
  isLoading: boolean;
  error?: unknown;
  permissions: Permission[];
} => {
  const isLoadingAuth = useAuth('useRBAC', (state) => state.isLoading);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>();
  const [data, setData] = React.useState<Record<string, boolean>>();
  const [checkedAdminUserId, setCheckedAdminUserId] = React.useState<string | number>();
  const permissionCheckIdRef = React.useRef(0);

  const warnOnce = React.useMemo(() => once(console.warn), []);

  const actualPermissionsToCheck: Permission[] = React.useMemo(() => {
    if (Array.isArray(permissionsToCheck)) {
      return permissionsToCheck;
    } else {
      warnOnce(
        'useRBAC: The first argument should be an array of permissions, not an object. This will be deprecated in the future.'
      );

      return Object.values(permissionsToCheck).flat();
    }
  }, [permissionsToCheck, warnOnce]);

  /**
   * This is the default value we return until the queryResults[i].data
   * are all resolved with data. This preserves the original behaviour.
   */
  const defaultAllowedActions = React.useMemo(() => {
    return actualPermissionsToCheck.reduce<Record<string, boolean>>((acc, permission) => {
      return {
        ...acc,
        [getActionName(permission)]: false,
      };
    }, {});
  }, [actualPermissionsToCheck]);

  const checkUserHasPermissions = useAuth(
    'useRBAC',
    (state) => state.checkUserHasPermissions,
    true
  );
  const adminUserId = useAuth('useRBAC', (state) => getAdminUserId(state.user));
  const userPermissions = useAuth('useRBAC', (state) => state.permissions);

  const permssionsChecked = usePrev(actualPermissionsToCheck);
  const contextChecked = usePrev(rawQueryContext);
  const previousAdminUserId = usePrev(adminUserId);
  const previousUserPermissions = usePrev(userPermissions);

  React.useEffect(() => {
    if (
      !isEqual(permssionsChecked, actualPermissionsToCheck) ||
      // TODO: also run this when the query context changes
      contextChecked !== rawQueryContext ||
      previousAdminUserId !== adminUserId ||
      !isEqual(previousUserPermissions, userPermissions)
    ) {
      setIsLoading(true);
      setData(undefined);
      setError(undefined);
      setCheckedAdminUserId(undefined);
      const permissionCheckId = ++permissionCheckIdRef.current;

      checkUserHasPermissions(actualPermissionsToCheck, passedPermissions, rawQueryContext)
        .then((res) => {
          if (res && permissionCheckId === permissionCheckIdRef.current) {
            setData(
              res.reduce<Record<string, boolean>>((acc, permission) => {
                return {
                  ...acc,
                  [getActionName(permission)]: true,
                };
              }, {})
            );
          }
        })
        .catch((err) => {
          if (permissionCheckId === permissionCheckIdRef.current) {
            setError(err);
          }
        })
        .finally(() => {
          if (permissionCheckId === permissionCheckIdRef.current) {
            setCheckedAdminUserId(adminUserId);
            setIsLoading(false);
          }
        });
    }
  }, [
    adminUserId,
    actualPermissionsToCheck,
    checkUserHasPermissions,
    passedPermissions,
    permissionsToCheck,
    permssionsChecked,
    contextChecked,
    previousAdminUserId,
    previousUserPermissions,
    rawQueryContext,
    userPermissions,
  ]);

  /**
   * This hook originally would not return allowedActions
   * until all the checks were complete.
   */
  const allowedActions = Object.entries({
    ...defaultAllowedActions,
    ...(checkedAdminUserId === adminUserId ? data : undefined),
  }).reduce((acc, [name, allowed]) => {
    acc[`can${capitalise(name)}`] = allowed;

    return acc;
  }, {} as AllowedActions);

  return {
    allowedActions,
    permissions: actualPermissionsToCheck,
    isLoading: isLoading || isLoadingAuth || checkedAdminUserId !== adminUserId,
    error,
  };
};

const getActionName = (permission: Permission): string => {
  const [action = ''] = permission.action.split('.').slice(-1);
  return action.split('-').map(capitalise).join('');
};

export { useRBAC };
export type { AllowedActions };
