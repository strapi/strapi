import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import pluginId from '../../pluginId';
import { resetPermissions, setPermissions } from './actions';

const selectPermissions = state => state.get(`${pluginId}_rbacManager`).permissions;

const selectCollectionTypePermissions = state =>
  state.get('permissionsManager').collectionTypesRelatedPermissions;

const useSyncRbac = (query, collectionTypeUID, containerName = 'listView') => {
  const collectionTypesRelatedPermissions = useSelector(selectCollectionTypePermissions);
  const permissions = useSelector(selectPermissions);
  const dispatch = useDispatch();

  const relatedPermissions = collectionTypesRelatedPermissions[collectionTypeUID];

  useEffect(() => {
    if (query && relatedPermissions) {
      dispatch(setPermissions(relatedPermissions, query.pluginOptions, containerName));

      return () => {
        dispatch(resetPermissions());
      };
    }

    return () => {};
  }, [relatedPermissions, dispatch, query, containerName]);

  return permissions;
};

export default useSyncRbac;
