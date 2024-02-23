import type { Schema, Documents, Common } from '@strapi/types';

import { createDefaultRepository } from './default';

/**
 * Returns the repository for the given content type.
 * Unused at the moment, until we decide the best way to expose the document service.
 */
export const createContentTypeRepository = (
  uid: Common.UID.CollectionType
): Documents.ServiceInstance<Schema.CollectionType> => {
  return createDefaultRepository(uid);
};
