import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import pluginId from '../../pluginId';
import { resetPermissions, setPermissions } from './actions';

const selectPermissions = state => state.get(`${pluginId}_rbacManager`).permissions;

const selectCollectionTypePermissions = state =>
  state.get('permissionsManager').collectionTypesRelatedPermissions;

const useSyncRbac = (query, collectionTypeUID = 'listView') => {
  const collectionTypesRelatedPermissions = useSelector(selectCollectionTypePermissions);
  const permissions = useSelector(selectPermissions);
  const dispatch = useDispatch();

  const relatedPermissions = collectionTypesRelatedPermissions[collectionTypeUID];

  useEffect(() => {
    if (query && query.pluginOptions && relatedPermissions) {
      dispatch(setPermissions(relatedPermissions, query.pluginOptions, 'listView'));

      return () => {
        dispatch(resetPermissions());
      };
    }
  }, [relatedPermissions, dispatch, query]);

  return permissions;
};

export default useSyncRbac;
