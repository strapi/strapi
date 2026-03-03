/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { COLLECTION_TYPES, SINGLE_TYPES } from '../constants/collections';

const ProtectedEditViewPage = React.lazy(() =>
  import('./EditView/EditViewPage').then((mod) => ({ default: mod.ProtectedEditViewPage }))
);
const ProtectedListViewPage = React.lazy(() =>
  import('./ListView/ListViewPage').then((mod) => ({ default: mod.ProtectedListViewPage }))
);

const CollectionTypePages = () => {
  const { collectionType } = useParams<{ collectionType: string }>();

  /**
   * We only support two types of collections.
   */
  if (collectionType !== COLLECTION_TYPES && collectionType !== SINGLE_TYPES) {
    return <Navigate to="/404" />;
  }

  return collectionType === COLLECTION_TYPES ? (
    <ProtectedListViewPage />
  ) : (
    <ProtectedEditViewPage />
  );
};

export { CollectionTypePages };
