import { useCallback, useMemo, useState } from 'react';

import { useQueries } from 'react-query';

import { useRBACProvider, Permission } from '../features/RBAC';

import { useFetchClient } from './useFetchClient';

import type { AxiosResponse } from 'axios';

export type AllowedActions = Record<string, boolean>;

export const useRBAC = (
  permissionsToCheck: Record<string, Permission[]> = {},
  passedPermissions?: Permission[]
): { allowedActions: AllowedActions; isLoading: boolean; setIsLoading: () => void } => {
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
      queryKey: ['useRBAC', name, ...permissions, userPermissions],
      async queryFn() {
        if (!permissions || !permissions.length) {
          return { name, hasPermission: true };
        }

        if (!userPermissions) return;

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
            } = await post<
              { data: { data: boolean[] } },
              AxiosResponse<{ data: { data: boolean[] } }>
            >('/admin/permissions/check', {
              permissions: matchingPermissions.map(({ action, subject }) => ({
                action,
                subject,
              })),
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
  ).reduce((acc, permission) => {
    if (!permission) return acc;

    const { name, hasPermission } = permission;

    acc[`can${capitalize(name)}`] = hasPermission;

    return acc;
  }, {} as AllowedActions);

  return { allowedActions, isLoading, setIsLoading };
};

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
