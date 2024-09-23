import { contentTypes as contentTypeUtils } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import { createSingleTypeService } from './single-type';
import { createCollectionTypeService } from './collection-type';

const isSingleType = (
  contentType: Struct.ContentTypeSchema
): contentType is Struct.SingleTypeSchema => contentTypeUtils.isSingleType(contentType);

/**
 * Returns a core api for the provided model
 */
function createService<T extends Struct.SingleTypeSchema | Struct.CollectionTypeSchema>(opts: {
  contentType: T;
}): T extends Struct.SingleTypeSchema
  ? Core.CoreAPI.Service.SingleType
  : Core.CoreAPI.Service.CollectionType;
function createService({
  contentType,
}: {
  contentType: Struct.CollectionTypeSchema | Struct.SingleTypeSchema;
}): Core.CoreAPI.Service.SingleType | Core.CoreAPI.Service.CollectionType {
  if (isSingleType(contentType)) {
    return createSingleTypeService(contentType);
  }

  return createCollectionTypeService(contentType);
}

export { createService };
