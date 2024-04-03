import type { Core, Modules } from '@strapi/types';

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
// TODO: support global document service middleware & per repo middlewares
export const createDocumentService = (strapi: Core.Strapi): Modules.Documents.Service => {
  const repositories = new Map<string, Modules.Documents.ServiceInstance>();
  const middlewares = createMiddlewareManager();

  middlewares.use(databaseErrorsMiddleware);

  const factory = function factory(uid) {
    if (repositories.has(uid)) {
      return repositories.get(uid)!;
    }

    const contentType = strapi.contentType(uid);
    const repository = createContentTypeRepository(uid);

    repositories.set(uid, middlewares.wrapObject(repository, { contentType }));

    return repository;
  } as Modules.Documents.Service;

  return Object.assign(factory, {
    utils: {
      transformData,
    },
    use: middlewares.use.bind(middlewares),
  });
};

/*

-> make all function receive a param object so we can have a simple object inside the middlewares to manipulate

strapi.documents('api::x.x').findOne({
  id: 1,
  populate: ['author'],
});

strapi.documents('api::x.x').findMany({
  limit: 10,
  sort: 'createdAt:desc',
});

strapi.documents('api::x.x').update({
  id: 1,
  data: { title: 'New title' },
});


-> expose some entry apis

-> expose some component apis

-> hide transformations


*/
