import { useSelector } from 'react-redux';

import selectCollectionTypesRelatedPermissions from '../../selectors/selectCollectionTypesRelatedPermissions';

const useContentTypePermissions = (slug) => {
  const collectionTypesRelatedPermissions = useSelector(selectCollectionTypesRelatedPermissions);

  const currentCTRelatedPermissions = collectionTypesRelatedPermissions[slug];
  const readPermissions =
    currentCTRelatedPermissions['plugin::content-manager.explorer.read'] || [];
  const createPermissions =
    currentCTRelatedPermissions['plugin::content-manager.explorer.create'] || [];

  return { createPermissions, readPermissions };
};

export default useContentTypePermissions;
