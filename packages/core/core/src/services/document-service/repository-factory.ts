import type { Internal, Modules } from '@strapi/types';

import { createSingleTypeRepository } from './single-type';
import { createCollectionTypeRepository } from './collection-type';

export const createContentTypeRepository = (
  contentType: Internal.Struct.SingleTypeSchema | Internal.Struct.CollectionTypeSchema
): Modules.Documents.ServiceInstance => {
  if (contentType.kind === 'singleType') {
    return createSingleTypeRepository(contentType);
  }
  return createCollectionTypeRepository(contentType);
};
