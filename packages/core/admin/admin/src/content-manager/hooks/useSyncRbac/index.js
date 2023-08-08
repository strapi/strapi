import { useSelector } from 'react-redux';

import { selectCollectionTypePermissions } from './selectors';

const useSyncRbac = (collectionTypeUID) => {
  const relatedPermissions = useSelector((state) =>
    selectCollectionTypePermissions(state, collectionTypeUID)
  );
  const permissions = [].concat(...Object.values(relatedPermissions));

  return permissions;
};

export default useSyncRbac;
