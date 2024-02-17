import type { Schema, Documents } from '@strapi/types';

import { createSingleTypeRepository } from './single-type';
import { createCollectionTypeRepository } from './collection-type';

import createMiddlewareManager from './middlewares';
import { loadDefaultMiddlewares } from './middlewares/defaults';

export const createContentTypeRepository = (
  contentType: Schema.SingleType | Schema.CollectionType
): Documents.ServiceInstance => {
  const middlewareManager = createMiddlewareManager();
  loadDefaultMiddlewares(middlewareManager);

  let repository: any;

  if (contentType.kind === 'singleType') {
    repository = createSingleTypeRepository(contentType, { middlewareManager });
  } else {
    repository = createCollectionTypeRepository(contentType, { middlewareManager });
  }

  return {
    ...repository,
    use(action, cb, opts) {
      middlewareManager.add(contentType.uid, action, cb, opts);
      return this;
    },
  };
};
