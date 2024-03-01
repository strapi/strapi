import { contentTypes as contentTypeUtils } from '@strapi/utils';
import type { Core, Internal } from '@strapi/types';

import createSingleTypeService from './single-type';
import createCollectionTypeService from './collection-type';

const isSingleType = (
  contentType: Internal.Struct.ContentTypeSchema
): contentType is Internal.Struct.SingleTypeSchema => contentTypeUtils.isSingleType(contentType);

/**
 * Returns a core api for the provided model
 */
function createService<
  T extends Internal.Struct.SingleTypeSchema | Internal.Struct.CollectionTypeSchema
>(opts: {
  contentType: T;
}): T extends Internal.Struct.SingleTypeSchema
  ? Core.CoreAPI.Service.SingleType
  : Core.CoreAPI.Service.CollectionType;
function createService({
  contentType,
}: {
  contentType: Internal.Struct.CollectionTypeSchema | Internal.Struct.SingleTypeSchema;
}): Core.CoreAPI.Service.SingleType | Core.CoreAPI.Service.CollectionType {
  if (isSingleType(contentType)) {
    return createSingleTypeService({ contentType });
  }

  return createCollectionTypeService({ contentType });
}

export { createService };
