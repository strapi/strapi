import type { Schema, Documents } from '@strapi/types';

import { createSingleTypeRepository } from './single-type';
import { createCollectionTypeRepository } from './collection-type';

export const createContentTypeRepository = (
  contentType: Schema.SingleType | Schema.CollectionType
): Documents.ServiceInstance<Schema.SingleType | Schema.CollectionType> => {
  if (contentType.kind === 'singleType') {
    return createSingleTypeRepository(contentType);
  }
  return createCollectionTypeRepository(contentType);
};
