import type { Schema } from '@strapi/types';

import { wrapInTransaction, type RepositoryFactoryMethod } from './common';
import createDocumentEngine from './document-engine';

export const createSingleTypeRepository: RepositoryFactoryMethod<Schema.SingleType> = (
  contentType,
  { middlewareManager }
) => {
  const { uid } = contentType;

  // TODO: move the code back into here instead of using the document-engine
  const documents = createDocumentEngine({ strapi, db: strapi?.db });

  async function findMany(params = {} as any) {
    return middlewareManager.run({ action: 'findMany', uid, params, options: {} }, ({ params }) =>
      documents.findMany(uid, params)
    );
  }

  async function findFirst(params = {} as any) {
    return middlewareManager.run({ action: 'findFirst', uid, params, options: {} }, ({ params }) =>
      documents.findFirst(uid, params)
    );
  }

  async function findOne(id: string, params = {} as any) {
    return middlewareManager.run(
      { action: 'findOne', uid, params, options: { id } },
      ({ params }) => documents.findOne(uid, id, params)
    );
  }

  async function deleteFn(id: string, params = {} as any) {
    return middlewareManager.run({ action: 'delete', uid, params, options: { id } }, ({ params }) =>
      documents.delete(uid, id, params)
    );
  }

  async function deleteMany(params = {} as any) {
    return middlewareManager.run({ action: 'deleteMany', uid, params, options: {} }, ({ params }) =>
      documents.deleteMany(uid, params)
    );
  }

  async function create(params = {} as any) {
    return middlewareManager.run({ action: 'create', uid, params, options: {} }, ({ params }) =>
      documents.create(uid, params)
    );
  }

  async function clone(id: string, params = {} as any) {
    return middlewareManager.run({ action: 'clone', uid, params, options: { id } }, ({ params }) =>
      documents.clone(uid, id, params)
    );
  }

  async function update(id: string, params = {} as any) {
    return middlewareManager.run({ action: 'update', uid, params, options: { id } }, ({ params }) =>
      documents.update(uid, id, params)
    );
  }

  async function count(params = {} as any) {
    return middlewareManager.run({ action: 'count', uid, params, options: {} }, ({ params }) =>
      documents.count(uid, params)
    );
  }

  async function publish(id: string, params = {} as any) {
    return middlewareManager.run(
      { action: 'publish', uid, params, options: { id } },
      ({ params }) => documents.publish(uid, id, params)
    );
  }

  async function unpublish(id: string, params = {} as any) {
    return middlewareManager.run(
      { action: 'unpublish', uid, params, options: { id } },
      ({ params }) => documents.unpublish(uid, id, params)
    );
  }

  async function discardDraft(id: string, params = {} as any) {
    return middlewareManager.run(
      { action: 'discardDraft', uid, params, options: { id } },
      ({ params }) => documents.discardDraft(uid, id, params)
    );
  }

  return {
    findMany: wrapInTransaction(findMany),
    findFirst: wrapInTransaction(findFirst),
    findOne: wrapInTransaction(findOne),
    delete: wrapInTransaction(deleteFn),
    deleteMany: wrapInTransaction(deleteMany),
    create: wrapInTransaction(create),
    clone: wrapInTransaction(clone),
    update: wrapInTransaction(update),
    count: wrapInTransaction(count),
    publish: wrapInTransaction(publish),
    unpublish: wrapInTransaction(unpublish),
    discardDraft: wrapInTransaction(discardDraft),
  };
};
