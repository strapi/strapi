import { contentTypes as contentTypeUtils } from '@strapi/utils';

import createSingleTypeService from './single-type';
import createCollectionTypeService from './collection-type';

import type { Common, CoreApi, Schema } from '../../types';

/**
 * Returns a core api for the provided model
 */
const createService = <TUID extends Common.UID.ContentType>({
  contentType,
}: {
  contentType: Schema.ContentType;
}): CoreApi.Service.ContentType<TUID> => {
  if (contentTypeUtils.isSingleType(contentType)) {
    return createSingleTypeService({ contentType });
  }

  return createCollectionTypeService({ contentType });
};

export { createService };
