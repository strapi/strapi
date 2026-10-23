import { contentTypes as contentTypeUtils } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import { SingleTypeController } from './single-type';
import { CollectionTypeController } from './collection-type';

const isSingleType = (
  contentType: Struct.ContentTypeSchema
): contentType is Struct.SingleTypeSchema => contentTypeUtils.isSingleType(contentType);

/**
 * Returns a core api controller for the provided model
 */
function createController<T extends Struct.SingleTypeSchema | Struct.CollectionTypeSchema>(opts: {
  strapi: Core.Strapi;
  contentType: T;
}): T extends Struct.SingleTypeSchema
  ? Core.CoreAPI.Controller.SingleType
  : Core.CoreAPI.Controller.CollectionType;
function createController({
  strapi,
  contentType,
}: {
  strapi: Core.Strapi;
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema;
}): Core.CoreAPI.Controller.SingleType | Core.CoreAPI.Controller.CollectionType {
  if (isSingleType(contentType)) {
    return new SingleTypeController({ strapi, contentType });
  }

  return new CollectionTypeController({ strapi, contentType });
}

export { createController };
export { getActionNames } from './core-controller';
