import * as React from 'react';

import { useTypedDispatch, useTypedSelector } from '../../core/store/hooks';
import { useAuth, type Permission } from '../../features/Auth';
import { resetPermissions, setPermissions } from '../modules/rbac';

type UseSyncRbac = (
  uid: string,
  query: { plugins?: object },
  containerName?: string
) => {
  isLoading: boolean;
  isError: boolean;
  permissions?: Permission[];
};

/* -------------------------------------------------------------------------------------------------
 * useSyncRbac
 * -----------------------------------------------------------------------------------------------*/
/**
 * TODO: figure out how to get rid of this. It's a bit of a weird hack to mutate permissions only
 * for the content-manager, if we devise a better way to handle RBAC in the entire app then this
 * can probably go...
 */
const useSyncRbac: UseSyncRbac = (collectionTypeUID, query, containerName = 'listView') => {
  const [isLoading, setIsLoading] = React.useState(true);
  const dispatch = useTypedDispatch();

  const userPermissions = useAuth('useSyncRbac', (state) => state.permissions);

  const relatedPermissions = React.useMemo(() => {
    const contentTypePermissions = userPermissions.filter(
      (permission) => permission.subject === collectionTypeUID
    );
    return contentTypePermissions.reduce<Record<string, Permission[]>>(
      (acc, permission) => ({ ...acc, [permission.action]: [permission] }),
      {}
    );
  }, [collectionTypeUID, userPermissions]);

  React.useEffect(() => {
    setIsLoading(true);

    if (relatedPermissions) {
      dispatch(
        setPermissions({
          permissions: relatedPermissions,
          __meta__: {
            plugins: query ? query.plugins : undefined,
            containerName,
          },
        })
      );
    }

    setIsLoading(false);

    return () => {
      dispatch(resetPermissions());
    };
  }, [relatedPermissions, dispatch, query, containerName]);

  const permissions = useTypedSelector((state) => state['content-manager'].rbac.permissions);

  // Check if the permissions are related to the current collectionTypeUID
  const isPermissionMismatch =
    permissions && permissions.some((permission) => permission.subject !== collectionTypeUID)
      ? true
      : false;

  return {
    isLoading,
    isError: !isLoading && isPermissionMismatch,
    permissions,
  };
};

export { useSyncRbac };
