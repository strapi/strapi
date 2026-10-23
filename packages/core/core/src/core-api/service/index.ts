import { contentTypes as contentTypeUtils } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import { SingleTypeService } from './single-type';
import { CollectionTypeService } from './collection-type';

const isSingleType = (
  contentType: Struct.ContentTypeSchema
): contentType is Struct.SingleTypeSchema => contentTypeUtils.isSingleType(contentType);

/**
 * Returns a core api for the provided model
 */
function createService<T extends Struct.SingleTypeSchema | Struct.CollectionTypeSchema>(opts: {
  strapi: Core.Strapi;
  contentType: T;
}): T extends Struct.SingleTypeSchema
  ? Core.CoreAPI.Service.SingleType
  : Core.CoreAPI.Service.CollectionType;
function createService({
  strapi,
  contentType,
}: {
  strapi: Core.Strapi;
  contentType: Struct.CollectionTypeSchema | Struct.SingleTypeSchema;
}): Core.CoreAPI.Service.SingleType | Core.CoreAPI.Service.CollectionType {
  if (isSingleType(contentType)) {
    return new SingleTypeService({ strapi, contentType });
  }

  return new CollectionTypeService({ strapi, contentType });
}

export { createService };
