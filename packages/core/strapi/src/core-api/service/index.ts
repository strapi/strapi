import { contentTypes as contentTypeUtils } from '@strapi/utils';
import type { CoreApi, Schema } from '@strapi/types';

import createSingleTypeService from './single-type';
import createCollectionTypeService from './collection-type';

const isSingleType = (contentType: Schema.ContentType): contentType is Schema.SingleType =>
  contentTypeUtils.isSingleType(contentType);

/**
 * Returns a core api for the provided model
 */
function createService<T extends Schema.SingleType | Schema.CollectionType>(opts: {
  contentType: T;
}): T extends Schema.SingleType ? CoreApi.Service.SingleType : CoreApi.Service.CollectionType;
function createService({
  contentType,
}: {
  contentType: Schema.CollectionType | Schema.SingleType;
}): CoreApi.Service.SingleType | CoreApi.Service.CollectionType {
  if (isSingleType(contentType)) {
    return createSingleTypeService({ contentType });
  }

  return createCollectionTypeService({ contentType });
}

export { createService };
