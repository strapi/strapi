import type { Core, Modules, UID } from '@strapi/types';

import { createMiddlewareManager, databaseErrorsMiddleware } from './middlewares';
import { createContentTypeRepository } from './repository';
import { transformData } from './transform/data';

/**
 * Repository to :
 * - Access documents via actions (findMany, findOne, create, update, delete, ...)
 * - Execute middlewares on document actions
 * - Apply default parameters to document actions
 *
 * @param strapi
 * @returns DocumentService
 *
 * @example Access documents
 * const article = strapi.documents('api::article.article').create(params)
 * const allArticles = strapi.documents('api::article.article').findMany(params)
 *
 */
export const createDocumentService = (strapi: Core.Strapi): Modules.Documents.Service => {
  // Cache the repositories (one per content type)
  const repositories = new Map<string, Modules.Documents.ServiceInstance>();

  // Manager to handle document service middlewares
  const middlewares = createMiddlewareManager();
  middlewares.use(databaseErrorsMiddleware);

  const factory = function factory(uid: UID.ContentType) {
    if (repositories.has(uid)) {
      return repositories.get(uid)!;
    }

    const contentType = strapi.contentType(uid);
    const repository = createContentTypeRepository(uid);

    const instance = middlewares.wrapObject(
      repository,
      { uid, contentType },
      {
        exclude: ['updateComponents', 'omitComponentData'],
      }
    );

    repositories.set(uid, instance);

    return instance;
  } as Modules.Documents.Service;

  return Object.assign(factory, {
    utils: {
      transformData,
    },
    use: middlewares.use.bind(middlewares),
  });
};
