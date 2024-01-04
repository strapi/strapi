import { useParams } from 'react-router-dom';

import { NotFoundPage } from '../../pages/NotFoundPage';

import { EditViewLayoutManager } from './EditViewLayoutManager';
import { ListViewLayoutManager } from './ListViewLayoutManager';

const CollectionTypePages = () => {
  const { collectionType } = useParams<{ collectionType: string }>();

  /**
   * We only support two types of collections.
   */
  if (collectionType !== 'collection-types' && collectionType !== 'single-types') {
    return <NotFoundPage />;
  }

  return collectionType === 'collection-types' ? (
    <ListViewLayoutManager />
  ) : (
    <EditViewLayoutManager />
  );
};

export { CollectionTypePages };
