import { omit, assoc, curry, merge } from 'lodash/fp';

import { async, contentTypes as contentTypesUtils } from '@strapi/utils';
import type { UID } from '@strapi/types';

import { wrapInTransaction, type RepositoryFactoryMethod } from './common';
import * as DP from './draft-and-publish';
import * as i18n from './internationalization';
import { transformParamsDocumentId } from './transform/id-transform';

import {
  createComponents,
  deleteComponents,
  getComponents,
  omitComponentData,
  updateComponents,
} from '../entity-service/components';

import { pickSelectionParams } from './params';
import entityValidator from '../entity-validator';
import { applyTransforms } from '../entity-service/attributes';
import { createDocumentId } from '../../utils/transform-content-types-to-models';
import { getDeepPopulate } from './utils/populate';
import { transformData } from './transform/data';

const transformParamsToQuery = curry((uid: UID.Schema, params: any) => {
  const query = strapi.get('query-params').transform(uid, params);

  return assoc('where', { ...params?.lookup, ...query.where }, query);
});

export const createContentTypeRepository: RepositoryFactoryMethod = (uid) => {
  const contentType = strapi.contentType(uid);
  const hasDraftAndPublish = contentTypesUtils.hasDraftAndPublish(contentType);

  async function findMany(params = {} as any) {
    const query = await async.pipe(
      DP.defaultToDraft,
      DP.statusToLookup(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      transformParamsDocumentId(uid),
      transformParamsToQuery(uid)
    )(params || {});

    return strapi.db.query(uid).findMany(query);
  }

  async function findFirst(params = {} as any) {
    const query = await async.pipe(
      DP.defaultToDraft,
      DP.statusToLookup(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      transformParamsDocumentId(uid),
      transformParamsToQuery(uid)
    )(params);

    return strapi.db.query(uid).findOne(query);
  }

  // TODO: do we really want to add filters on the findOne now that we have findFirst ?
  async function findOne(documentId: string, params = {} as any) {
    const query = await async.pipe(
      DP.defaultToDraft,
      DP.statusToLookup(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      transformParamsDocumentId(uid),
      transformParamsToQuery(uid),
      (query) => assoc('where', { ...query.where, documentId }, query)
    )(params);

    return strapi.db.query(uid).findOne(query);
  }

  async function deleteEntry(id: number) {
    const componentsToDelete = await getComponents(uid, { id });

    await strapi.db.query(uid).delete({ where: { id } });

    await deleteComponents(uid, componentsToDelete as any, { loadComponents: false });
  }

  async function deleteFn(documentId: string, params = {} as any) {
    const query = await async.pipe(
      omit('status'),
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType),
      transformParamsToQuery(uid),
      (query) => assoc('where', { ...query.where, documentId }, query)
    )(params);

    if (params.status === 'draft') {
      throw new Error('Cannot delete a draft document');
    }

    const entriesToDelete = await strapi.db.query(uid).findMany(query);

    // Delete all matched entries and its components
    await async.map(entriesToDelete, (entryToDelete: any) => deleteEntry(entryToDelete.id));

    return { deletedEntries: entriesToDelete };
  }

  async function createEntry(params = {} as any) {
    const { data, ...restParams } = await transformParamsDocumentId(uid, params);

    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any); // select / populate

    // Validation
    if (!data) {
      throw new Error('Create requires data attribute');
    }

    // @ts-expect-error we need type guard to assert that data has the valid type
    const validData = await entityValidator.validateEntityCreation(contentType, data, {
      // Note: publishedAt value will always be set when DP is disabled
      isDraft: !params?.data?.publishedAt,
      locale: params?.locale,
    });

    // Component handling
    const componentData = await createComponents(uid, validData);
    const contentTypeWithoutComponentData = omitComponentData(contentType, validData);
    const entryData = applyTransforms(
      Object.assign(contentTypeWithoutComponentData, componentData) as any,
      { contentType }
    );

    const doc = await strapi.db.query(uid).create({ ...query, data: entryData });

    return doc;
  }

  async function create(params = {} as any) {
    const queryParams = await async.pipe(
      DP.filterDataPublishedAt,
      DP.setStatusToDraft(contentType),
      DP.statusToData(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToData(contentType)
    )(params);

    const doc = await createEntry(queryParams);

    if (hasDraftAndPublish && params.status === 'published') {
      return publish(doc.documentId, params).then((doc) => doc.versions[0]);
    }

    return doc;
  }

  async function clone(documentId: string, params = {} as any) {
    const queryParams = await async.pipe(
      DP.filterDataPublishedAt,
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    // Get deep populate
    const entriesToClone = await strapi.db?.query(uid).findMany({
      where: {
        ...queryParams?.lookup,
        documentId,
        // DP Enabled: Clone drafts
        // DP Disabled: Clone only the existing version (published)
        publishedAt: { $null: hasDraftAndPublish },
      },
      populate: getDeepPopulate(uid, { relationalFields: ['id'] }),
    });

    const clonedEntries = await async.map(
      entriesToClone,
      async.pipe(
        omit('id'),
        // assign new documentId
        assoc('documentId', createDocumentId()),
        // Merge new data into it
        (data) => merge(data, queryParams.data),
        (data) => createEntry({ ...queryParams, data, status: 'draft' })
      )
    );

    return { documentId: clonedEntries.at(0)?.documentId, versions: clonedEntries };
  }

  async function update(documentId: string, params = {} as any) {
    const queryParams = await async.pipe(
      DP.filterDataPublishedAt,
      DP.setStatusToDraft(contentType),
      DP.statusToLookup(contentType),
      DP.statusToData(contentType),
      // Default locale will be set if not provided
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      i18n.localeToData(contentType)
    )(params);

    const { data, ...restParams } = await transformParamsDocumentId(uid, queryParams || {});
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams || {}) as any);

    // Validation
    const model = strapi.contentType(uid);
    // Find if document exists
    const entryToUpdate = await strapi.db
      .query(uid)
      .findOne({ ...query, where: { ...queryParams?.lookup, ...query?.where, documentId } });

    let updatedDraft = null;
    if (entryToUpdate) {
      const validData = await entityValidator.validateEntityUpdate(
        model,
        // @ts-expect-error we need type guard to assert that data has the valid type
        data,
        {
          isDraft: !queryParams?.data?.publishedAt, // Always update the draft version
          locale: queryParams?.locale,
        },
        entryToUpdate
      );

      // Component handling
      const componentData = await updateComponents(uid, entryToUpdate, validData as any);
      const entryData = applyTransforms(
        Object.assign(omitComponentData(model, validData), componentData as any),
        { contentType: model }
      );

      updatedDraft = await strapi.db
        .query(uid)
        .update({ ...query, where: { id: entryToUpdate.id }, data: entryData });
    }

    if (!updatedDraft) {
      const documentExists = await strapi.db
        .query(contentType.uid)
        .findOne({ where: { documentId } });

      if (documentExists) {
        updatedDraft = await createEntry({
          ...queryParams,
          data: { ...queryParams.data, documentId },
        });
      }
    }

    if (hasDraftAndPublish && updatedDraft && params.status === 'published') {
      return publish(documentId, params).then((doc) => doc.versions[0]);
    }

    return updatedDraft;
  }

  async function count(params = {} as any) {
    const query = await async.pipe(
      DP.defaultStatus(contentType),
      DP.statusToLookup(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      transformParamsToQuery(uid)
    )(params);

    return strapi.db.query(uid).count(query);
  }

  async function publish(documentId: string, params = {} as any) {
    const queryParams = await async.pipe(
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    await deleteFn(documentId, {
      ...queryParams,
      lookup: { ...queryParams?.lookup, publishedAt: { $ne: null } },
    });

    // Get deep populate
    const entriesToPublish = await strapi.db?.query(uid).findMany({
      where: {
        ...queryParams?.lookup,
        documentId,
        publishedAt: null,
      },
      populate: getDeepPopulate(uid, { relationalFields: ['documentId', 'locale'] }),
    });

    // Transform draft entry data and create published versions
    const publishedEntries = await async.map(
      entriesToPublish,
      async.pipe(
        // Updated at value is used to know if draft has been modified
        // If both versions share the same value, it means the draft has not been modified
        (draft) => assoc('updatedAt', draft.updatedAt, draft),
        assoc('publishedAt', new Date()),
        assoc('documentId', documentId),
        omit('id'),
        // Transform relations to target published versions
        (entry) => {
          const opts = { uid, locale: entry.locale, status: 'published', allowMissingId: true };
          return transformData(entry, opts);
        },
        // Create the published entry
        (data) => createEntry({ ...queryParams, data, locale: data.locale, status: 'published' })
      )
    );

    return { versions: publishedEntries };
  }

  async function unpublish(documentId: string, params = {} as any) {
    const queryParams = await async.pipe(
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    const { deletedEntries } = await deleteFn(documentId, {
      ...params,
      lookup: { ...queryParams?.lookup, publishedAt: { $ne: null } },
    });

    return { versions: deletedEntries };
  }

  async function discardDraft(documentId: string, params = {} as any) {
    const queryParams = await async.pipe(
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    await deleteFn(documentId, {
      ...queryParams,
      // Delete all drafts that match query
      lookup: { ...queryParams?.lookup, publishedAt: null },
    });

    // Get deep populate of published versions
    const entriesToDraft = await strapi.db?.query(uid).findMany({
      where: {
        ...queryParams?.lookup,
        documentId,
        publishedAt: { $ne: null },
      },
      populate: getDeepPopulate(uid, { relationalFields: ['documentId', 'locale'] }),
    });

    // Transform published entry data and create draft versions
    const draftEntries = await async.map(
      entriesToDraft,
      async.pipe(
        assoc('publishedAt', null),
        assoc('documentId', documentId),
        omit('id'),
        // Transform relations to target draft versions
        (entry) => {
          const opts = { uid, locale: entry.locale, status: 'draft', allowMissingId: true };
          return transformData(entry, opts);
        },
        // Create the draft entry
        (data) => createEntry({ ...queryParams, locale: data.locale, data, status: 'draft' })
      )
    );

    return { versions: draftEntries };
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
    publish: hasDraftAndPublish ? wrapInTransaction(publish) : (undefined as any),
    unpublish: hasDraftAndPublish ? wrapInTransaction(unpublish) : (undefined as any),
    discardDraft: hasDraftAndPublish ? wrapInTransaction(discardDraft) : (undefined as any),
  };
};
