import { omit } from 'lodash/fp';

import { pipeAsync } from '@strapi/utils';

import { wrapInTransaction, type RepositoryFactoryMethod } from '../common';
import createDocumentEngine from '../document-engine';
import * as DP from '../draft-and-publish';
import * as i18n from '../internationalization';

export const createContentTypeRepository: RepositoryFactoryMethod = (uid) => {
  const contentType = strapi.contentType(uid);

  // TODO: move the code back into here instead of using the document-engine
  const documents = createDocumentEngine({ strapi, db: strapi?.db });

  async function findMany(params = {} as any) {
    // TODO: replace with chaining
    const queryParams = await pipeAsync(
      DP.defaultToDraft,
      DP.statusToLookup,
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType)
    )(params);

    return documents.findMany(uid, queryParams);
  }

  async function findFirst(params = {} as any) {
    const queryParams = await pipeAsync(
      DP.defaultToDraft,
      DP.statusToLookup,
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType)
    )(params);

    return documents.findFirst(uid, queryParams);
  }

  async function findOne(id: string, params = {} as any) {
    const queryParams = await pipeAsync(
      DP.defaultToDraft,
      DP.statusToLookup,
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType)
    )(params);

    return documents.findOne(uid, id, queryParams);
  }

  async function deleteFn(id: string, params = {} as any) {
    const queryParams = await pipeAsync(
      omit('status'),
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    return documents.delete(uid, id, queryParams);
  }

  async function create(params = {} as any) {
    const queryParams = await pipeAsync(
      DP.setStatusToDraft,
      DP.statusToData,
      DP.filterDataPublishedAt,
      i18n.defaultLocale(contentType),
      i18n.localeToData(contentType)
    )(params);

    const doc = await documents.create(uid, queryParams);

    if (params.status === 'published') {
      return documents.create(uid, {
        ...queryParams,
        data: {
          ...queryParams.data,
          documentId: doc.id,
          publishedAt: params?.data?.publishedAt ?? new Date(),
        },
      });
    }

    return doc;
  }

  async function clone(id: string, params = {} as any) {
    const queryParams = await pipeAsync(
      DP.filterDataPublishedAt,
      i18n.localeToLookup(contentType)
    )(params);

    return documents.clone(uid, id, queryParams);
  }

  async function update(id: string, params = {} as any) {
    const queryParams = await pipeAsync(
      DP.setStatusToDraft,
      DP.statusToLookup,
      DP.statusToData,
      DP.filterDataPublishedAt,
      // Default locale will be set if not provided
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      i18n.localeToData(contentType)
    )(params);

    let updatedDraft = await documents.update(uid, id, queryParams);

    if (!updatedDraft) {
      const documentExists = await strapi.db
        .query(contentType.uid)
        .findOne({ where: { documentId: id } });

      if (documentExists) {
        updatedDraft = await create({
          ...queryParams,
          data: { ...queryParams.data, documentId: id },
        });
      }
    }

    if (updatedDraft && params.status === 'published') {
      await documents.delete(uid, id, {
        ...queryParams,
        status: 'published',
        lookup: { ...params?.lookup, publishedAt: { $notNull: true } },
      });

      return documents.create(uid, {
        ...queryParams,
        data: {
          ...queryParams.data,
          documentId: updatedDraft.id,
          publishedAt: params?.data?.publishedAt ?? new Date(),
        },
      });
    }

    return updatedDraft;
  }

  async function count(params = {} as any) {
    const queryParams = await pipeAsync(
      DP.defaultToDraft,
      DP.statusToLookup,
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType)
    )(params);

    return documents.count(uid, queryParams);
  }

  async function publish(id: string, params = {} as any) {
    const queryParams = await pipeAsync(
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    return documents.publish(uid, id, queryParams);
  }

  async function unpublish(id: string, params = {} as any) {
    const queryParams = await pipeAsync(
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    return documents.unpublish(uid, id, queryParams);
  }

  async function discardDraft(id: string, params = {} as any) {
    const queryParams = await pipeAsync(
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    return documents.discardDraft(uid, id, queryParams);
  }

  return {
    findMany: wrapInTransaction(findMany),
    findFirst: wrapInTransaction(findFirst),
    findOne: wrapInTransaction(findOne),
    delete: wrapInTransaction(deleteFn),
    create: wrapInTransaction(create),
    clone: wrapInTransaction(clone),
    update: wrapInTransaction(update),
    count: wrapInTransaction(count),
    publish: wrapInTransaction(publish),
    unpublish: wrapInTransaction(unpublish),
    discardDraft: wrapInTransaction(discardDraft),
  };
};
