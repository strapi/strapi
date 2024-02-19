import { Strapi, Documents, Common } from '@strapi/types';

import { createContentTypeRepository } from './repository-factory';
import { createMiddlewareManager } from './middlewares';

/**
 * Repository to :
 * - Access documents via actions (findMany, findOne, create, update, delete, ...)
 * - Execute middlewares on document actions
 * - Apply default parameters to document actions
 *
 * @param strapi
 * @param options.defaults - Default parameters to apply to all actions
 * @param options.parent - Parent repository, used when creating a new repository with .with()
 * @returns DocumentService
 *
 * @example Access documents
 * const article = strapi.documents('api::article.article').create(params)
 * const allArticles = strapi.documents('api::article.article').findMany(params)
 *
 */
// TODO: support global document service middleware & per repo middlewares
export const createDocumentService = (strapi: Strapi): any => {
  const repositories = new Map<string, Documents.ServiceInstance>();
  const middlewares = createMiddlewareManager();

  function factory<TUID extends Common.UID.ContentType>(
    uid: TUID
  ): Documents.ServiceInstance<TUID> {
    if (repositories.has(uid)) {
      return repositories.get(uid)!;
    }

    const contentType = strapi.contentType(uid);
    const repository = createContentTypeRepository(contentType);

    repositories.set(uid, middlewares.wrapObject(repository, { contentType }));

    return repository;
  }

  return Object.assign(factory, {
    use: middlewares.use.bind(middlewares),
  });
};
