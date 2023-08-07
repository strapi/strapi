import { useCallback, useMemo, useState } from 'react';

import { useQueries } from 'react-query';

import { useRBACProvider } from '../features/RBAC';

import { useFetchClient } from './useFetchClient';

/**
 * @typedef {Object} Permission
 * @property {string} action
 * @property {string} subject
 * @property {string[]} conditions
 */

/**
 * @type {(permissionsToCheck: Record<string, Permission[]>, passedPermissions?: Permission[]) => { allowedActions: Record<string, boolean>, isLoading: boolean, setIsLoading: () => void }}
 */
export const useRBAC = (permissionsToCheck, passedPermissions) => {
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  /**
   * This is the default value we return until the queryResults[i].data
   * are all resolved with data. This preserves the original behaviour.
   */
  const defaultAllowedActions = useMemo(
    () =>
      Object.keys(permissionsToCheck).map((name) => ({
        name,
        hasPermission: false,
      })),
    [permissionsToCheck]
  );

  const { allPermissions } = useRBACProvider();
  const { post } = useFetchClient();

  const userPermissions = passedPermissions || allPermissions;

  const permissionsToCheckEntries = Object.entries(permissionsToCheck);

  const queryResults = useQueries(
    permissionsToCheckEntries.map(([name, permissions]) => ({
      queryKey: ['useRBAC', name, permissions, userPermissions],
      async queryFn() {
        if (!permissions || !permissions.length) {
          return { name, hasPermission: true };
        }

        const matchingPermissions = userPermissions.filter((value) => {
          const associatedPermission = permissions.find(
            (perm) => perm.action === value.action && perm.subject === value.subject
          );

          return associatedPermission !== undefined;
        });

        if (
          matchingPermissions.length > 0 &&
          matchingPermissions.every(
            (permission) => Array.isArray(permission.conditions) && permission.conditions.length > 0
          )
        ) {
          /**
           * We only "check" when there are conditions to check against.
           * Otherwise, knowing there's a matching permission is enough.
           */
          try {
            const {
              data: { data },
            } = await post('/admin/permissions/check', {
              permissions: matchingPermissions.map(({ action, subject }) => ({ action, subject })),
            });

            return { name, hasPermission: Array.isArray(data) && data.every((v) => v === true) };
          } catch (err) {
            /**
             * We don't notify the user if the request fails.
             * Instead we declare they dont have the permission.
             *
             * TODO: is this accurate?
             */
            return { name, hasPermission: false };
          }
        }

        return { name, hasPermission: matchingPermissions.length > 0 };
      },
    }))
  );

  /**
   * This function is used to synchronise the hook when used in dynamic components
   *
   * TODO: Is this still needed?
   */
  const setIsLoading = useCallback(() => {
    setInternalIsLoading(true);
  }, []);

  const isLoading = internalIsLoading || queryResults.some((res) => res.isLoading);

  const data = queryResults.map((res) => res.data);

  /**
   * This hook originally would not return allowedActions
   * until all the checks were complete.
   */
  const allowedActions = (
    data.some((res) => res === undefined) ? defaultAllowedActions : data
  ).reduce((acc, { name, hasPermission }) => {
    acc[`can${capitalize(name)}`] = hasPermission;

    return acc;
  }, {});

  return { allowedActions, isLoading, setIsLoading };
};

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
