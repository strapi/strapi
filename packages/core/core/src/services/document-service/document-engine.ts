import type { Database } from '@strapi/database';
import type { Documents, Schema, Strapi, Shared, Common } from '@strapi/types';
import {
  contentTypes as contentTypesUtils,
  convertQueryParams,
  mapAsync,
  pipeAsync,
} from '@strapi/utils';

import { isArray, omit, set } from 'lodash/fp';
import uploadFiles from '../utils/upload-files';

import {
  cloneComponents,
  createComponents,
  deleteComponents,
  getComponents,
  omitComponentData,
  updateComponents,
} from '../entity-service/components';

import { createDocumentId } from '../../utils/transform-content-types-to-models';
import { applyTransforms } from '../entity-service/attributes';
import entityValidator from '../entity-validator';
import { pickSelectionParams } from './params';
import { transformParamsDocumentId } from './transform/id-transform';
import { getDeepPopulate } from './utils/populate';
import { transformData } from './transform/data';

const { transformParamsToQuery } = convertQueryParams;

/**
 * TODO: Sanitization / validation built-in
 * TODO: i18n - Move logic to i18n package
 * TODO: Webhooks
 * TODO: Audit logs
 * TODO: File upload
 * TODO: availableLocales
 *
 */
type Context = {
  contentType: Schema.ContentType;
};

const createPipeline = (data: Record<string, unknown>, context: Context) => {
  return applyTransforms(data, context);
};

const updatePipeline = (data: Record<string, unknown>, context: Context) => {
  return applyTransforms(data, context);
};

const createDocumentEngine = ({
  strapi,
  db,
}: {
  strapi: Strapi;
  db: Database;
}): Documents.Engine => ({
  uploadFiles,

  async findMany(uid, params) {
    const { kind } = strapi.getModel(uid);

    const query = await pipeAsync(
      (params) => transformParamsToQuery(uid, params),
      (query) => set('where', { ...params?.lookup, ...query.where }, query)
    )(params || {});

    if (kind === 'singleType') {
      return db.query(uid).findOne(query);
    }

    return db.query(uid).findMany(query);
  },

  async findFirst(uid, params) {
    const query = await pipeAsync((params) => transformParamsToQuery(uid, params))(params || {});

    return db.query(uid).findOne({ ...query, where: { ...params?.lookup, ...query.where } });
  },

  async findOne(uid, documentId, params) {
    const query = await pipeAsync((params) => transformParamsToQuery(uid, params))(params || {});

    return db
      .query(uid)
      .findOne({ ...query, where: { ...params?.lookup, ...query.where, documentId } });
  },

  async delete(uid, documentId, params = {} as any) {
    const query = await pipeAsync(
      (params) => transformParamsToQuery(uid, params),
      (query) => set('where', { ...params?.lookup, ...query.where, documentId }, query)
    )(params);

    if (params.status === 'draft') {
      throw new Error('Cannot delete a draft document');
    }

    const entriesToDelete = await db.query(uid).findMany(query);

    // Delete all matched entries and its components
    await mapAsync(entriesToDelete, async (entryToDelete: any) => {
      const componentsToDelete = await getComponents(uid, entryToDelete);
      await db.query(uid).delete({ where: { id: entryToDelete.id } });
      await deleteComponents(uid, componentsToDelete as any, { loadComponents: false });
    });

    // TODO: Change return value to actual count
    return { versions: entriesToDelete };
  },

  // TODO: should we provide two separate methods?
  async deleteMany(uid, paramsOrIds) {
    const query = await pipeAsync(
      // Transform ids to query if needed
      (params) => (isArray(params) ? { filter: { documentID: { $in: params } } } : params),
      (params) => transformParamsToQuery(uid, params)
    )(paramsOrIds || {});

    return db.query(uid).deleteMany(query);
  },

  async create(uid, params) {
    // Param parsing
    const { data, ...restParams } = await transformParamsDocumentId(uid, params, {
      locale: params.locale,
      // @ts-expect-error - published at is not always present
      // User can not set publishedAt on create, but other methods in the engine can (publish)
      isDraft: !params.data?.publishedAt,
    });
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any); // select / populate

    // Validation
    if (!params.data) {
      throw new Error('Create requires data attribute');
    }

    const model = strapi.getModel(uid) as Shared.ContentTypes[Common.UID.ContentType];

    const validData = await entityValidator.validateEntityCreation(model, data, {
      isDraft: !data.publishedAt,
      locale: params?.locale,
    });

    // Component handling
    const componentData = await createComponents(uid, validData as any);
    const entryData = createPipeline(
      Object.assign(omitComponentData(model, validData), componentData),
      { contentType: model }
    );

    return db.query(uid).create({ ...query, data: entryData });
  },

  // NOTE: What happens if user doesn't provide specific publications state and locale to update?
  async update(uid, documentId, params) {
    // Param parsing
    const { data, ...restParams } = await transformParamsDocumentId(uid, params || {}, {
      isDraft: true,
      locale: params?.locale,
    });
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams || {}) as any);

    // Validation
    const model = strapi.getModel(uid);
    // Find if document exists
    const entryToUpdate = await db
      .query(uid)
      .findOne({ ...query, where: { ...params?.lookup, ...query?.where, documentId } });
    if (!entryToUpdate) return null;

    const validData = await entityValidator.validateEntityUpdate(
      model,
      data,
      {
        isDraft: true, // Always update the draft version
        locale: params?.locale,
      },
      entryToUpdate
    );

    // Component handling
    const componentData = await updateComponents(uid, entryToUpdate, validData as any);
    const entryData = updatePipeline(
      Object.assign(omitComponentData(model, validData), componentData),
      { contentType: model }
    );

    return db.query(uid).update({ ...query, where: { id: entryToUpdate.id }, data: entryData });
  },

  async count(uid, params = undefined) {
    const query = await pipeAsync(
      (params) => transformParamsToQuery(uid, params),
      (query) => set('where', { ...params?.lookup, ...query.where }, query)
    )(params || {});

    return db.query(uid).count(query);
  },

  async clone(uid, documentId, params) {
    const { data, ...restParams } = await transformParamsDocumentId(uid, params || {}, {
      isDraft: true,
      locale: params?.locale,
    });
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any);
    // Param parsing

    // Validation
    const model = strapi.getModel(uid);
    // Find all locales of the document
    const entries = await db.query(uid).findMany({
      ...query,
      where: { ...params?.lookup, ...query.where, documentId },
    });

    // Document does not exist
    if (!entries.length) {
      return null;
    }

    const newDocumentId = createDocumentId();

    const versions = await mapAsync(entries, async (entryToClone: any) => {
      const isDraft = contentTypesUtils.isDraft(data);
      // Todo: Merge data with entry to clone
      const validData = await entityValidator.validateEntityUpdate(
        model,
        // Omit id fields, the cloned entity id will be generated by the database
        omit(['id'], data),
        { isDraft, ...params?.lookup },
        entryToClone
      );

      const componentData = await cloneComponents(uid, entryToClone, validData);
      const entityData = createPipeline(
        Object.assign(omitComponentData(model, validData), componentData),
        { contentType: model }
      );

      // TODO: Transform params to query
      return db.query(uid).clone(entryToClone.id, {
        ...query,
        // Allows entityData to override the documentId (e.g. when publishing)
        data: { documentId: newDocumentId, ...entityData, locale: entryToClone.locale },
      });
    });

    return { documentId: newDocumentId, versions };
  },

  // TODO: Handle relations so they target the published version
  async publish(uid, documentId, params) {
    // Delete already published versions that match the locales to be published
    await this.delete(uid, documentId, {
      ...params,
      lookup: { ...params?.lookup, publishedAt: { $ne: null } },
    });

    // Get deep populate
    const entriesToPublish = await strapi.db?.query(uid).findMany({
      where: {
        ...params?.lookup,
        documentId,
        publishedAt: null,
      },
      populate: getDeepPopulate(uid),
    });

    // Transform draft entry data and create published versions
    const publishedEntries = await mapAsync(
      entriesToPublish,
      pipeAsync(
        set('publishedAt', new Date()),
        set('documentId', documentId),
        omit('id'),
        // Transform relations to target published versions
        (entry) => {
          const opts = { uid, locale: entry.locale, isDraft: false, allowMissingId: true };
          return transformData(entry, opts);
        },
        // Create the published entry
        (data) => this.create(uid, { ...params, data, locale: data.locale })
      )
    );

    return { versions: publishedEntries };
  },

  async unpublish(uid, documentId, params) {
    // Delete all published versions
    return this.delete(uid, documentId, {
      ...params,
      lookup: { ...params?.lookup, publishedAt: { $ne: null } },
    }) as any;
  },

  /**
   * Steps:
   * - Delete the matching draft versions (publishedAt = null)
   * - Clone the matching published versions into draft versions
   *
   * If the document has a published version, the draft version will be created from the published version.
   * If the document has no published version, the version will be removed.
   */
  async discardDraft(uid, documentId, params) {
    // Delete draft versions, clone published versions into draft versions
    await this.delete(uid, documentId, {
      ...params,
      // Delete all drafts that match query
      lookup: { ...params?.lookup, publishedAt: null },
    });

    // Get deep populate of published versions
    const entriesToDraft = await strapi.db?.query(uid).findMany({
      where: {
        ...params?.lookup,
        documentId,
        publishedAt: { $ne: null },
      },
      populate: getDeepPopulate(uid),
    });

    // Transform published entry data and create draft versions
    const draftEntries = await mapAsync(
      entriesToDraft,
      pipeAsync(
        set('publishedAt', null),
        set('documentId', documentId),
        omit('id'),
        // Transform relations to target draft versions
        (entry) => {
          const opts = { uid, locale: entry.locale, isDraft: true, allowMissingId: true };
          return transformData(entry, opts);
        },
        // Create the draft entry
        (data) => this.create(uid, { ...params, locale: data.locale, data })
      )
    );

    return { versions: draftEntries };
  },
});

export default (ctx: { strapi: Strapi; db: Database }): Documents.Engine => {
  const implementation = createDocumentEngine(ctx);

  // TODO: Wrap with database error handling
  return implementation;
};
