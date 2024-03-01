import type { Internal } from '@strapi/types';

import { wrapInTransaction, type RepositoryFactoryMethod } from './common';
import createDocumentEngine from './document-engine';
import * as DP from './draft-and-publish';
import * as i18n from './internationalization';

export const createCollectionTypeRepository: RepositoryFactoryMethod<
  Internal.Struct.CollectionTypeSchema
> = (contentType) => {
  const { uid } = contentType;

  // TODO: move the code back into here instead of using the document-engine
  const documents = createDocumentEngine({ strapi, db: strapi?.db });

  async function findMany(params = {} as any) {
    // TODO: replace with chaining
    DP.defaultToDraft(params);
    DP.statusToLookup(params);
    i18n.defaultLocale(contentType, params);
    i18n.localeToLookup(contentType, params);

    return documents.findMany(uid, params);
  }

  async function findFirst(params = {} as any) {
    DP.defaultToDraft(params);
    DP.statusToLookup(params);
    i18n.defaultLocale(contentType, params);
    i18n.localeToLookup(contentType, params);

    return documents.findFirst(uid, params);
  }

  async function findOne(id: string, params = {} as any) {
    DP.defaultToDraft(params);
    DP.statusToLookup(params);
    i18n.defaultLocale(contentType, params);
    i18n.localeToLookup(contentType, params);

    return documents.findOne(uid, id, params);
  }

  async function deleteFn(id: string, params = {} as any) {
    DP.statusToLookup(params);
    i18n.localeToLookup(contentType, params);

    return documents.delete(uid, id, params);
  }

  async function deleteMany(params = {} as any) {
    return documents.deleteMany(uid, params);
  }

  async function create(params = {} as any) {
    DP.setStatusToDraft(params);
    DP.statusToData(params);
    DP.filterDataPublishedAt(params);
    i18n.defaultLocale(contentType, params);
    i18n.localeToData(contentType, params);

    return documents.create(uid, params);
  }

  async function clone(id: string, params = {} as any) {
    DP.filterDataPublishedAt(params);
    i18n.localeToLookup(contentType, params);

    return documents.clone(uid, id, params);
  }

  async function update(id: string, params = {} as any) {
    DP.setStatusToDraft(params);
    DP.statusToLookup(params);
    DP.statusToData(params);
    DP.filterDataPublishedAt(params);
    // Default locale will be set if not provided
    i18n.defaultLocale(contentType, params);
    i18n.localeToLookup(contentType, params);
    i18n.localeToData(contentType, params);

    const res = await documents.update(uid, id, params);

    if (!res) {
      const documentExists = await strapi.db
        .query(contentType.uid)
        .findOne({ where: { documentId: id } });

      if (documentExists) {
        return create({
          ...params,
          data: { ...params.data, documentId: id },
        });
      }
    }

    return res;
  }

  async function count(params = {} as any) {
    DP.defaultToDraft(params);
    i18n.defaultLocale(contentType, params);

    return documents.count(uid, params);
  }

  async function publish(id: string, params = {} as any) {
    i18n.localeToLookup(contentType, params);

    return documents.publish(uid, id, params);
  }

  async function unpublish(id: string, params = {} as any) {
    i18n.localeToLookup(contentType, params);

    return documents.unpublish(uid, id, params);
  }

  async function discardDraft(id: string, params = {} as any) {
    i18n.localeToLookup(contentType, params);

    return documents.discardDraft(uid, id, params);
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
