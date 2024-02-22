import { omit } from 'lodash/fp';

import type { Documents, Schema } from '@strapi/types';
import { pipeAsync } from '@strapi/utils';

import { wrapInTransaction, type RepositoryFactoryMethod } from './common';
import createDocumentEngine from './document-engine';
import * as DP from './draft-and-publish';
import * as i18n from './internationalization';

export const createSingleTypeRepository: RepositoryFactoryMethod<Schema.SingleType> = (
  contentType
): Documents.ServiceInstance<Schema.SingleType> => {
  const { uid } = contentType;

  // TODO: move the code back into here instead of using the document-engine
  const documents = createDocumentEngine({ strapi, db: strapi?.db });

  async function find(params = {} as any) {
    const queryParams = await pipeAsync(
      DP.defaultToDraft,
      DP.statusToLookup,
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType)
    )(params);

    return documents.findFirst(uid, queryParams);
  }

  async function update(params = {} as any) {
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

    const existingDoc = await strapi.db.query(contentType.uid).findOne();
    let doc: Documents.AnyDocument | null;

    if (!existingDoc) {
      doc = await documents.create(uid, queryParams);
    } else {
      doc = await documents.update(uid, existingDoc.documentId, queryParams);

      if (!doc) {
        doc = await documents.create(uid, {
          ...queryParams,
          data: { ...queryParams.data, documentId: existingDoc.documentId },
        });
      }
    }

    if (params.status === 'published') {
      // @ts-expect-error invalid ID type
      await documents.delete(uid, doc.id, {
        ...queryParams,
        status: 'published',
        lookup: { ...params?.lookup, publishedAt: { $notNull: true } },
      });

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

  async function deleteFn(params = {} as any) {
    // always delete both draft & published
    const queryParams = await pipeAsync(
      omit('status'),
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    const existingDoc = await strapi.db.query(contentType.uid).findOne();
    return documents.delete(uid, existingDoc.documentId, queryParams);
  }

  async function publish(params = {} as any) {
    const queryParams = await pipeAsync(
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    const existingDoc = await strapi.db.query(contentType.uid).findOne();
    return documents.publish(uid, existingDoc.documentId, queryParams);
  }

  async function unpublish(params = {} as any) {
    const queryParams = await pipeAsync(
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    const existingDoc = await strapi.db.query(contentType.uid).findOne();
    return documents.unpublish(uid, existingDoc.documentId, queryParams);
  }

  async function discardDraft(params = {} as any) {
    const queryParams = await pipeAsync(
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    const existingDoc = await strapi.db.query(contentType.uid).findOne();
    return documents.discardDraft(uid, existingDoc.documentId, queryParams);
  }

  return {
    find: wrapInTransaction(find),
    delete: wrapInTransaction(deleteFn),
    update: wrapInTransaction(update),
    publish: wrapInTransaction(publish),
    unpublish: wrapInTransaction(unpublish),
    discardDraft: wrapInTransaction(discardDraft),
  };
};
