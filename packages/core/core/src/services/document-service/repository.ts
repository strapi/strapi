import { omit, assoc, curry } from 'lodash/fp';

import {
  pipeAsync,
  mapAsync,
  convertQueryParams,
  contentTypes as contentTypesUtils,
} from '@strapi/utils';
import { Common } from '@strapi/types';

import { wrapInTransaction, type RepositoryFactoryMethod } from './common';
import * as DP from './draft-and-publish';
import * as i18n from './internationalization';
import { transformParamsDocumentId } from './transform/id-transform';

import {
  cloneComponents,
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

const transformParamsToQuery = curry((uid: Common.UID.Schema, params: any) => {
  const query = convertQueryParams.transformParamsToQuery(uid, params);

  return assoc('where', { ...params?.lookup, ...query.where }, query);
});

export const createContentTypeRepository: RepositoryFactoryMethod = (uid) => {
  const contentType = strapi.contentType(uid);
  const hasDraftAndPublish = contentTypesUtils.hasDraftAndPublish(contentType);

  async function findMany(params = {} as any) {
    const query = await pipeAsync(
      DP.defaultToDraft(contentType),
      DP.statusToLookup(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      (queryParams) =>
        transformParamsDocumentId(uid, queryParams, { isDraft: queryParams.status === 'draft' }),
      transformParamsToQuery(uid)
    )(params || {});

    return strapi.db.query(uid).findMany(query);
  }

  async function findFirst(params = {} as any) {
    const query = await pipeAsync(
      DP.defaultToDraft(contentType),
      DP.statusToLookup(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      (queryParams) =>
        transformParamsDocumentId(uid, queryParams, { isDraft: queryParams.status === 'draft' }),
      transformParamsToQuery(uid)
    )(params);

    return strapi.db.query(uid).findOne(query);
  }

  // TODO: do we really want to add filters on the findOne now that we have findFirst ?
  async function findOne(documentId: string, params = {} as any) {
    const query = await pipeAsync(
      DP.defaultToDraft(contentType),
      DP.statusToLookup(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      (queryParams) =>
        transformParamsDocumentId(uid, queryParams, { isDraft: queryParams.status === 'draft' }),
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
    const query = await pipeAsync(
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
    await mapAsync(entriesToDelete, (entryToDelete: any) => deleteEntry(entryToDelete.id));

    return { deletedEntries: entriesToDelete.length };
  }

  async function createEntry(params = {} as any) {
    const { data, ...restParams } = await transformParamsDocumentId(uid, params, {
      locale: params.locale,
      // User can not set publishedAt on create, but other methods in the engine can (publish)
      isDraft: !params.data?.publishedAt,
    });

    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any); // select / populate

    // Validation
    if (!params.data) {
      throw new Error('Create requires data attribute');
    }

    const validData = await entityValidator.validateEntityCreation(contentType, data, {
      isDraft: !data.publishedAt,
      locale: params?.locale,
    });

    // Component handling
    const componentData = await createComponents(uid, validData as any);
    const entryData = applyTransforms(
      Object.assign(omitComponentData(contentType, validData), componentData),
      { contentType }
    );

    const doc = await strapi.db.query(uid).create({ ...query, data: entryData });

    return doc;
  }

  async function create(params = {} as any) {
    const queryParams = await pipeAsync(
      DP.setStatusToDraft(contentType),
      DP.statusToData(contentType),
      DP.filterDataPublishedAt(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToData(contentType)
    )(params);

    const doc = await createEntry(queryParams);

    if (params.status === 'published') {
      return publish(doc.documentId, params).then((doc) => doc.versions[0]);
    }

    return doc;
  }

  async function clone(documentId: string, params = {} as any) {
    const queryParams = await pipeAsync(
      DP.filterDataPublishedAt(contentType),
      i18n.localeToLookup(contentType)
    )(params);

    const { data, ...restParams } = await transformParamsDocumentId(uid, queryParams || {}, {
      isDraft: true,
      locale: queryParams?.locale,
    });
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any);
    // Param parsing

    // Validation
    const model = strapi.contentType(uid);
    // Find all locales of the document
    const entries = await strapi.db.query(uid).findMany({
      ...query,
      where: { ...queryParams?.lookup, ...query.where, documentId },
    });

    // Document does not exist
    if (!entries.length) {
      return null;
    }

    const newDocumentId = createDocumentId();

    const versions = await mapAsync(entries, async (entryToClone: any) => {
      const isDraft = contentTypesUtils.isDraft(data, model);
      // Todo: Merge data with entry to clone
      const validData = await entityValidator.validateEntityUpdate(
        model,
        // Omit id fields, the cloned entity id will be generated by the database
        omit(['id'], data),
        { isDraft, ...queryParams?.lookup },
        entryToClone
      );

      const componentData = await cloneComponents(uid, entryToClone, validData);
      const entityData = applyTransforms(
        Object.assign(omitComponentData(model, validData), componentData),
        { contentType: model }
      );

      // TODO: Transform params to query
      return strapi.db.query(uid).clone(entryToClone.id, {
        ...query,
        // Allows entityData to override the documentId (e.g. when publishing)
        data: { documentId: newDocumentId, ...entityData, locale: entryToClone.locale },
      });
    });

    return { documentId: newDocumentId, versions };
  }

  // NOTE: What happens if user doesn't provide specific publications state and locale to update?
  async function update(documentId: string, params = {} as any) {
    const queryParams = await pipeAsync(
      DP.setStatusToDraft(contentType),
      DP.statusToLookup(contentType),
      DP.statusToData(contentType),
      DP.filterDataPublishedAt(contentType),
      // Default locale will be set if not provided
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      i18n.localeToData(contentType)
    )(params);

    const { data, ...restParams } = await transformParamsDocumentId(uid, queryParams || {}, {
      isDraft: !params?.data?.publishedAt,
      locale: queryParams?.locale,
    });
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
        data,
        {
          isDraft: !params?.data?.publishedAt, // Always update the draft version
          locale: queryParams?.locale,
        },
        entryToUpdate
      );

      // Component handling
      const componentData = await updateComponents(uid, entryToUpdate, validData as any);
      const entryData = applyTransforms(
        Object.assign(omitComponentData(model, validData), componentData),
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

    if (updatedDraft && params.status === 'published') {
      return publish(documentId, params).then((doc) => doc.versions[0]);
    }

    return updatedDraft;
  }

  async function count(params = {} as any) {
    const query = await pipeAsync(
      DP.defaultToDraft(contentType),
      DP.statusToLookup(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      transformParamsToQuery(uid)
    )(params);

    return strapi.db.query(uid).count(query);
  }

  async function publish(documentId: string, params = {} as any) {
    const queryParams = await pipeAsync(
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
      populate: getDeepPopulate(uid),
    });

    // Transform draft entry data and create published versions
    const publishedEntries = await mapAsync(
      entriesToPublish,
      pipeAsync(
        assoc('publishedAt', new Date()),
        assoc('documentId', documentId),
        omit('id'),
        // Transform relations to target published versions
        (entry) => {
          const opts = { uid, locale: entry.locale, isDraft: false, allowMissingId: true };
          return transformData(entry, opts);
        },
        // Create the published entry
        (data) => createEntry({ ...queryParams, data, locale: data.locale })
      )
    );

    return { versions: publishedEntries };
  }

  async function unpublish(documentId: string, params = {} as any) {
    const queryParams = await pipeAsync(
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
    const queryParams = await pipeAsync(
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
      populate: getDeepPopulate(uid),
    });

    // Transform published entry data and create draft versions
    const draftEntries = await mapAsync(
      entriesToDraft,
      pipeAsync(
        assoc('publishedAt', null),
        assoc('documentId', documentId),
        omit('id'),
        // Transform relations to target draft versions
        (entry) => {
          const opts = { uid, locale: entry.locale, isDraft: true, allowMissingId: true };
          return transformData(entry, opts);
        },
        // Create the draft entry
        (data) => createEntry({ ...queryParams, locale: data.locale, data })
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
