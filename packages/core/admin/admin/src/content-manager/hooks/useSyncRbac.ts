import { useEffect } from 'react';

import { useTypedDispatch, useTypedSelector } from '../../core/store/hooks';
import { resetPermissions, setPermissions } from '../modules/rbac';

/* -------------------------------------------------------------------------------------------------
 * useSyncRbac
 * -----------------------------------------------------------------------------------------------*/
/**
 * TODO: figure out how to get rid of this. It's a bit of a weird hack to mutate permissions only
 * for the content-manager, if we devise a better way to handle RBAC in the entire app then this
 * can probably go...
 */
const useSyncRbac = (
  collectionTypeUID: string,
  query: { plugins?: object },
  containerName: string = 'listView'
) => {
  const dispatch = useTypedDispatch();

  const collectionTypesRelatedPermissions = useTypedSelector(
    (state) => state.rbacProvider.collectionTypesRelatedPermissions
  );

  const relatedPermissions = collectionTypesRelatedPermissions[collectionTypeUID];

  useEffect(() => {
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

      return () => {
        dispatch(resetPermissions());
      };
    }

    return () => {};
  }, [relatedPermissions, dispatch, query, containerName]);

  const permissions = useTypedSelector((state) => state['content-manager'].rbac.permissions);

  // Check if the permissions are related to the current collectionTypeUID
  const isPermissionMismatch =
    permissions?.some((permission) => permission.subject !== collectionTypeUID) ?? true;

  return {
    isLoading: permissions === null,
    isError: isPermissionMismatch,
    permissions,
  };
};

export { useSyncRbac };
