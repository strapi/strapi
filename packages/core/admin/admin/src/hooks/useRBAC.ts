import { useEffect, useMemo, useState } from 'react';

import isEqual from 'lodash/isEqual';

import { useAuth, Permission } from '../features/Auth';
import { capitalise } from '../utils/strings';

import { usePrev } from './usePrev';

type AllowedActions = Record<string, boolean>;

const useRBAC = (
  permissionsToCheck: Record<string, Permission[]> = {},
  passedPermissions?: Permission[]
): { allowedActions: AllowedActions; isLoading: boolean; error?: unknown } => {
  const userPermissions = useAuth('useRBAC', (state) => state.permissions);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [data, setData] = useState<Record<string, boolean>>();
  /**
   * This is the default value we return until the queryResults[i].data
   * are all resolved with data. This preserves the original behaviour.
   */
  const defaultAllowedActions = useMemo(
    () =>
      Object.keys(permissionsToCheck).reduce<Record<string, boolean>>(
        (acc, name) => ({
          ...acc,
          [name]: false,
        }),
        {}
      ),
    [permissionsToCheck]
  );

  const checkUserHasPermissions = useAuth('useRBAC', (state) => state.checkUserHasPermissions);

  const permssionsChecked = usePrev(permissionsToCheck);
  useEffect(() => {
    if (!isEqual(permssionsChecked, permissionsToCheck)) {
      setIsLoading(true);
      setData(undefined);
      setError(undefined);

      const permissionEntries = Object.entries(permissionsToCheck);

      for (const [name, permissions] of permissionEntries) {
        checkUserHasPermissions(permissions, passedPermissions)
          .then((res) => {
            if (res) {
              setData((s) => ({
                ...s,
                [name]: res,
              }));
            }
          })
          .catch((err) => {
            setError(err);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }
  }, [checkUserHasPermissions, passedPermissions, permissionsToCheck, permssionsChecked]);

  const actions = {
    ...defaultAllowedActions,
    ...data,
  };

  /**
   * This hook originally would not return allowedActions
   * until all the checks were complete.
   */
  const allowedActions = Object.entries(actions).reduce((acc, [name, allowed]) => {
    acc[`can${capitalise(name)}`] = allowed;

    return acc;
  }, {} as AllowedActions);

  return { allowedActions, isLoading: isLoading || userPermissions.length === 0, error };
};

export { useRBAC };
export type { AllowedActions };
