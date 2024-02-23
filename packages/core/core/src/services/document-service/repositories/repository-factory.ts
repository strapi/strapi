import type { Schema, Documents } from '@strapi/types';

import { createDefaultRepository } from './default';

/**
 * Returns the repository for the given content type.
 * Unused at the moment, until we decide the best way to expose the document service.
 */
export const createContentTypeRepository = (
  contentType: Schema.SingleType | Schema.CollectionType
): Documents.ServiceInstance<Schema.CollectionType> => {
  return createDefaultRepository(contentType);
};
