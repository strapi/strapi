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
import { transformParamsDocumentId, transformOutputDocumentId } from './transform/id-transform';

const { transformParamsToQuery } = convertQueryParams;

/**
 * TODO: Sanitization / validation built-in
 * TODO: i18n - Move logic to i18n package
 * TODO: Webhooks
 * TODO: Audit logs
 * TODO: Entity Validation - Uniqueness across same locale and publication status
 * TODO: File upload
 * TODO: replace 'any'
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
      (params) => transformParamsDocumentId(uid, params, { isDraft: true, locale: params.locale }),
      (params) => transformParamsToQuery(uid, params),
      (query) => set('where', { ...params?.lookup, ...query.where }, query)
    )(params || {});

    if (kind === 'singleType') {
      return db
        .query(uid)
        .findOne(query)
        .then((doc) => transformOutputDocumentId(uid, doc));
    }

    return db
      .query(uid)
      .findMany(query)
      .then((doc) => transformOutputDocumentId(uid, doc));
  },

  async findFirst(uid, params) {
    const query = await pipeAsync(
      (params) => transformParamsDocumentId(uid, params, { isDraft: true, locale: params.locale }),
      (params) => transformParamsToQuery(uid, params)
    )(params || {});

    return db
      .query(uid)
      .findOne({ ...query, where: { ...params?.lookup, ...query.where } })
      .then((doc) => transformOutputDocumentId(uid, doc));
  },

  async findOne(uid, documentId, params) {
    const query = await pipeAsync(
      (params) => transformParamsDocumentId(uid, params, { isDraft: true, locale: params.locale }),
      (params) => transformParamsToQuery(uid, params)
    )(params || {});

    return db
      .query(uid)
      .findOne({ ...query, where: { ...params?.lookup, ...query.where, documentId } })
      .then((doc) => transformOutputDocumentId(uid, doc));
  },

  async delete(uid, documentId, params = {} as any) {
    const query = await pipeAsync(
      // TODO: What if we are deleting more than one locale / publication state?
      (params) => transformParamsDocumentId(uid, params, { isDraft: true, locale: params.locale }),
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
    return { versions: await transformOutputDocumentId(uid, entriesToDelete) };
  },

  // TODO: should we provide two separate methods?
  async deleteMany(uid, paramsOrIds) {
    const query = await pipeAsync(
      // Transform ids to query if needed
      (params) => (isArray(params) ? { filter: { documentID: { $in: params } } } : params),
      (params) => transformParamsDocumentId(uid, params, { isDraft: true, locale: params.locale }),
      (params) => transformParamsToQuery(uid, params)
    )(paramsOrIds || {});

    return db.query(uid).deleteMany(query);
  },

  async create(uid, params) {
    // Param parsing
    const { data, ...restParams } = await transformParamsDocumentId(uid, params, {
      locale: params.locale,
      isDraft: true,
    });
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any); // select / populate

    // Validation
    if (!params.data) {
      throw new Error('Create requires data attribute');
    }

    const model = strapi.getModel(uid) as Shared.ContentTypes[Common.UID.ContentType];

    const validData = await entityValidator.validateEntityCreation(model, data, {
      isDraft: true,
      locale: params?.locale,
    });

    // Component handling
    const componentData = await createComponents(uid, validData as any);
    const entryData = createPipeline(
      Object.assign(omitComponentData(model, validData), componentData),
      { contentType: model }
    );

    return db
      .query(uid)
      .create({ ...query, data: entryData })
      .then((doc) => transformOutputDocumentId(uid, doc));
  },

  // NOTE: What happens if user doesn't provide specific publications state and locale to update?
  async update(uid, documentId, params) {
    // TODO: Prevent updating a published document
    // TODO: File upload

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

    return db
      .query(uid)
      .update({ ...query, where: { id: entryToUpdate.id }, data: entryData })
      .then((doc) => transformOutputDocumentId(uid, doc));
  },

  async count(uid, params = undefined) {
    const query = await pipeAsync(
      (params) => transformParamsDocumentId(uid, params, { isDraft: true, locale: params.locale }),
      (params) => transformParamsToQuery(uid, params),
      (query) => set('where', { ...params?.lookup, ...query.where }, query)
    )(params || {});

    return db.query(uid).count(query);
  },

  async clone(uid, documentId, params) {
    // TODO: File upload
    // TODO: Entity validator.

    // Param parsing
    const { data, ...restParams } = await transformParamsDocumentId(uid, params || {}, {
      isDraft: true,
      locale: params?.locale,
    });
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any);

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

      // Omit id fields, the cloned entity id will be generated by the database
      const dataWithoutId = omit(['id'], data);
      const validationParams = { isDraft, ...params?.lookup };

      let validData;
      if (params?.asUpdate) {
        // Todo: Merge data with entry to clone
        validData = await entityValidator.validateEntityUpdate(
          model,
          dataWithoutId,
          validationParams,
          entryToClone
        );
      } else {
        // TODO clean up
        // In this case, we are creating a new document, so we need to validate the creation
        validData = await entityValidator.validateEntityCreation(
          model,
          dataWithoutId,
          validationParams
        );
      }

      const componentData = await cloneComponents(uid, entryToClone, validData);
      const entityData = createPipeline(
        Object.assign(omitComponentData(model, validData), componentData),
        { contentType: model }
      );

      // TODO: Transform params to query
      return db
        .query(uid)
        .clone(entryToClone.id, {
          ...query,
          // Allows entityData to override the documentId (e.g. when publishing)
          data: { documentId: newDocumentId, ...entityData, locale: entryToClone.locale },
        })
        .then((doc) => transformOutputDocumentId(uid, doc));
    });

    return { id: newDocumentId, versions };
  },

  // TODO: Handle relations so they target the published version
  async publish(uid, documentId, params) {
    // Delete already published versions that match the locales to be published
    await this.delete(uid, documentId, {
      ...params,
      lookup: { ...params?.lookup, publishedAt: { $ne: null } },
    });

    // Clone every draft version to be published
    const clonedDocuments = (await this.clone(uid, documentId, {
      ...(params || {}),
      // @ts-expect-error - Generic type does not have publishedAt attribute by default
      data: { documentId, publishedAt: new Date() },
      asUpdate: true,
    })) as any;

    // TODO: Return actual count
    return { versions: clonedDocuments?.versions || [] };
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
   */
  async discardDraft(uid, documentId, params) {
    // Delete draft versions, clone published versions into draft versions
    await this.delete(uid, documentId, {
      ...params,
      // Delete all drafts that match query
      lookup: { ...params?.lookup, publishedAt: null },
    });

    // Clone published versions into draft versions
    const clonedDocuments = (await this.clone(uid, documentId, {
      ...(params || {}),
      // Clone only published versions
      lookup: { ...params?.lookup, publishedAt: { $ne: null } },
      // @ts-expect-error - Generic type does not have publishedAt attribute by default
      data: { documentId, publishedAt: null },
    })) as any;

    return { versions: clonedDocuments?.versions || [] };
  },
});

export default (ctx: { strapi: Strapi; db: Database }): Documents.Engine => {
  const implementation = createDocumentEngine(ctx);

  // TODO: Wrap with database error handling
  return implementation;
};
