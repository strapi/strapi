import type { Database } from '@strapi/database';
import type { Common, Documents, Schema, Shared, Strapi } from '@strapi/types';
import { contentTypes as contentTypesUtils, convertQueryParams, mapAsync } from '@strapi/utils';

import { isArray, omit } from 'lodash/fp';
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
    return { versions: entriesToDelete };
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

    const query = transformParamsToQuery(uid, pickSelectionParams(params || {}));

    // Find all locales of the document
    const entryToUpdate = await db
      .query(uid)
      .findOne({ ...query, where: { ...params?.lookup, ...query?.where, documentId } });

    // Document does not exist
    if (!entryToUpdate) {
      return null;
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
    const query = transformParamsToQuery(uid, params || ({} as any));
    query.where = { ...params?.lookup, ...query.where };

    return db.query(uid).count(query);
  },

  async clone(uid, documentId, params) {
    // TODO: File upload
    // TODO: Entity validator.
    const { data = {} as any } = params!;

    const model = strapi.getModel(uid);
    const query = transformParamsToQuery(uid, pickSelectionParams(params));

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
        { isDraft },
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

export default (ctx: { strapi: Strapi; db: Database }): Documents.Service => {
  const implementation = createDocumentService(ctx);

  // TODO: Wrap with database error handling
  return implementation;
};
