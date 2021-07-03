import { useSelector } from 'react-redux';
import selectCollectionTypesRelatedPermissions from '../../selectors/selectCollectionTypesRelatedPermissions';

const useContentTypePermissions = slug => {
  const collectionTypesRelatedPermissions = useSelector(selectCollectionTypesRelatedPermissions);

  const currentCTRelatedPermissions = collectionTypesRelatedPermissions[slug];
  const readPermissions =
    currentCTRelatedPermissions['plugins::content-manager.explorer.read'] || [];
  const createPermissions =
    currentCTRelatedPermissions['plugins::content-manager.explorer.create'] || [];

  return { createPermissions, readPermissions };
};

export default useContentTypePermissions;
