import type { Common, Strapi, Schema, Shared, Documents } from '@strapi/types';
import { contentTypes as contentTypesUtils, convertQueryParams, mapAsync } from '@strapi/utils';
import type { Database } from '@strapi/database';

import { isArray, omit } from 'lodash/fp';
import uploadFiles from '../utils/upload-files';

import {
  omitComponentData,
  getComponents,
  createComponents,
  updateComponents,
  deleteComponents,
  cloneComponents,
} from '../entity-service/components';

import { pickSelectionParams } from './params';
import { applyTransforms } from '../entity-service/attributes';
import { createDocumentId } from '../../utils/transform-content-types-to-models';
import entityValidator from '../entity-validator';

const { transformParamsToQuery } = convertQueryParams;

/**
 * TODO: Sanitization / validation built-in
 * TODO: i18n - Move logic to i18n package
 * TODO: Webhooks
 * TODO: Audit logs
 * TODO: Entity Validation - Uniqueness across same locale and publication status
 * TODO: File upload
 * TODO: Transactions?
 * TODO: replace 'any'
 * TODO: countVersions()
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

const createDocumentService = ({
  strapi,
  db,
}: {
  strapi: Strapi;
  db: Database;
}): Documents.Service => ({
  uploadFiles,

  async findMany(uid, params) {
    const { kind } = strapi.getModel(uid);

    const query = transformParamsToQuery(uid, params || ({} as any));
    query.where = { ...params?.lookup, ...query.where };

    if (kind === 'singleType') {
      return db.query(uid).findOne(query);
    }

    return db.query(uid).findMany(query);
  },

  async findFirst(uid, params) {
    const query = transformParamsToQuery(uid, params || ({} as any));

    return db.query(uid).findOne({ ...query, where: { ...params?.lookup, ...query.where } });
  },

  async findOne(uid, documentId, params) {
    const query = transformParamsToQuery(uid, params || ({} as any));
    return db
      .query(uid)
      .findOne({ ...query, where: { ...params?.lookup, ...query.where, documentId } });
  },

  async delete(uid, documentId, params = {} as any) {
    const query = transformParamsToQuery(uid, params as any);

    if (params.status === 'draft') {
      throw new Error('Cannot delete a draft document');
    }

    const entriesToDelete = await db.query(uid).findMany({
      ...query,
      where: {
        ...params.lookup,
        ...query?.where,
        documentId,
      },
    });

    // Delete all matched entries and its components
    await mapAsync(entriesToDelete, async (entryToDelete: any) => {
      const componentsToDelete = await getComponents(uid, entryToDelete);
      await db.query(uid).delete({ where: { id: entryToDelete.id } });
      await deleteComponents(uid, componentsToDelete as any, { loadComponents: false });
    });

    // TODO: Change return value to actual count
    return entriesToDelete.at(0);
  },

  // TODO: should we provide two separate methods?
  async deleteMany(uid, paramsOrIds) {
    let queryParams;
    if (isArray(paramsOrIds)) {
      queryParams = { filter: { documentID: { $in: paramsOrIds } } };
    } else {
      queryParams = paramsOrIds;
    }

    const query = transformParamsToQuery(uid, queryParams || ({} as any));

    return db.query(uid).deleteMany(query);
  },

  async create(uid, params) {
    // TODO: Entity validator.
    // TODO: File upload - Probably in the lifecycles?
    const { data } = params;

    if (params.status === 'published') {
      throw new Error(
        'Cannot directly create a published document. Use the publish method instead.'
      );
    }

    if (!data) {
      throw new Error('Create requires data attribute');
    }

    const model = strapi.getModel(uid) as Shared.ContentTypes[Common.UID.ContentType];

    const validData = await entityValidator.validateEntityCreation(model, data, { isDraft: true });

    const componentData = await createComponents(uid, validData);
    const entryData = createPipeline(
      Object.assign(omitComponentData(model, validData), componentData),
      {
        contentType: model,
      }
    );

    // select / populate
    const query = transformParamsToQuery(uid, pickSelectionParams(params));

    return db.query(uid).create({ ...query, data: entryData });
  },

  // NOTE: What happens if user doesn't provide specific publications state and locale to update?
  async update(uid, documentId, params) {
    // TODO: Prevent updating a published document
    // TODO: Entity validator.
    // TODO: File upload
    const { data } = params || {};
    const model = strapi.getModel(uid) as Shared.ContentTypes[Common.UID.ContentType];

    if (params?.status === 'published') {
      throw new Error('Cannot update a published document. Use the publish method instead.');
    }

    const query = transformParamsToQuery(uid, pickSelectionParams(params || {}));

    // Find all locales of the document
    const entries = await db
      .query(uid)
      .findMany({ ...query, where: { ...params?.lookup, ...query?.where, documentId } });

    // Document does not exist
    if (!entries.length) {
      return null;
    }

    // TODO: How do we do this from i18n package?
    const entryToUpdate = entries.find((entry) => entry.locale === params?.locale);

    // Upsert new locale
    if (!entryToUpdate) {
      const validData = await entityValidator.validateEntityCreation(
        model,
        data as any,
        { isDraft: true } // Always create the draft version
      );

      // @ts-expect-error - fix type
      const componentData = await createComponents(uid, validData);
      const entryData = createPipeline(
        Object.assign(omitComponentData(model, validData), componentData),
        { contentType: model }
      );

      entryData.documentId = documentId;

      return db.query(uid).create({ ...query, data: entryData });
    }

    const validData = await entityValidator.validateEntityUpdate(
      model,
      data,
      { isDraft: true }, // Always update the draft version
      entryToUpdate
    );

    const componentData = await updateComponents(uid, entryToUpdate, validData);
    const entryData = updatePipeline(
      Object.assign(omitComponentData(model, validData), componentData),
      { contentType: model }
    );

    return db.query(uid).update({ ...query, where: { id: entryToUpdate.id }, data: entryData });
  },

  async count(uid, params = undefined) {
    const query = transformParamsToQuery(uid, pickSelectionParams(params || {}));

    return db.query(uid).count(query) as any;
  },

  async clone(uid, documentId, params) {
    // TODO: File upload
    // TODO: Entity validator.
    const { data = {} as any } = params!;

    if (params?.status === 'published') {
      throw new Error('Cannot directly clone a published document');
    }

    const model = strapi.getModel(uid);
    const query = transformParamsToQuery(uid, pickSelectionParams(params));

    // Find all locales of the document
    const entries = await db.query(uid).findMany({
      ...query,
      where: { ...params?.lookup, ...query.where, documentId, publishedAt: null },
    });

    // Document does not exist
    if (!entries.length) {
      return null;
    }

    const newDocumentId = createDocumentId();

    const result = await mapAsync(entries, async (entryToClone: any) => {
      const isDraft = contentTypesUtils.isDraft(data);
      // Todo: Merge data with entry to clone
      const validData = await entityValidator.validateEntityUpdate(
        model,
        // Omit id fields, the cloned entity id will be generated by the database
        omit(['id'], data),
        { isDraft },
        entryToClone
      );

      const componentData = await cloneComponents(uid, entryToClone, validData);
      const entityData = createPipeline(
        Object.assign(omitComponentData(model, validData), componentData),
        { contentType: model }
      );

      // TODO: Transform params to query
      const clonedEntry = await db.query(uid).clone(entryToClone.id, {
        ...query,
        // Allows entityData to override the documentId (e.g. when publishing)
        data: { documentId: newDocumentId, ...entityData, locale: entryToClone.locale },
      });
      return clonedEntry;
    });

    return { documentId: newDocumentId, result };
  },

  // TODO: Handle relations so they target the published version
  async publish(uid, documentId, params) {
    if (params?.status === 'published') {
      throw new Error('Cannot publish a document that is already published');
    }

    // Delete already published versions that match the locales to be published
    await this.delete(uid, documentId, {
      ...params,
      lookup: { ...params?.lookup, publishedAt: { $ne: null } },
    });

    // Clone every draft version to be published
    await this.clone(uid, documentId, {
      ...(params || {}),
      // @ts-expect-error - Generic type does not have publishedAt attribute by default
      data: { documentId, publishedAt: new Date() },
    });

    // TODO: Return actual count
    return 0;
  },

  async unpublish(uid, documentId, params) {
    if (params?.status === 'draft') {
      throw new Error('Cannot unpublish a document that is already a draft');
    }

    // TODO: Discard draft
    // Delete all published versions
    await this.delete(uid, documentId, {
      ...params,
      lookup: { ...params?.lookup, publishedAt: { $ne: null } },
    });

    // TODO: Return actual count
    return 0;
  },
});

export default (ctx: { strapi: Strapi; db: Database }): Documents.Service => {
  const implementation = createDocumentService(ctx);

  // TODO: Wrap with database error handling
  return implementation;
};
