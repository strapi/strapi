import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { resetPermissions, setPermissions } from './actions';
import { selectCollectionTypePermissions, selectPermissions } from './selectors';

const useSyncRbac = (query, collectionTypeUID, containerName = 'listView') => {
  const dispatch = useDispatch();

  const collectionTypesRelatedPermissions = useSelector(selectCollectionTypePermissions);
  const permissions = useSelector(selectPermissions);

  const relatedPermissions = collectionTypesRelatedPermissions[collectionTypeUID];

  useEffect(() => {
    if (relatedPermissions) {
      dispatch(setPermissions(relatedPermissions, query ? query.plugins : null, containerName));

      return () => {
        dispatch(resetPermissions());
      };
    }

    return () => {};
  }, [relatedPermissions, dispatch, query, containerName]);

  // Check if the permissions are related to the current collectionTypeUID
  const isPermissionMismatch =
    permissions?.some((permission) => permission.subject !== collectionTypeUID) ?? true;

  return {
    isValid: permissions && !isPermissionMismatch,
    permissions,
  };
};

export default useSyncRbac;
