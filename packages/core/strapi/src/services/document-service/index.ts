import type { Strapi, DocumentService, EntityValidator, EventHub } from '@strapi/types';
import { convertQueryParams, mapAsync } from '@strapi/utils';
import type { Database } from '@strapi/database';

import { isArray } from 'lodash/fp';
import uploadFiles from '../utils/upload-files';
import { pickSelectionParams } from './params';

const { transformParamsToQuery } = convertQueryParams;

/**
 * TODO: TESTS - In progress
 * TODO: Components
 * TODO: Entity Validation
 * TODO: Lifecycles
 *        Plugin extensions
 * TODO: D&P
 * TODO: i18n
 * TODO: Apply default parameters (status & locale)
 * TODO: Sanitization / validation built-in
 * TODO: Other methods
 *        Count
 *        FindPage
 *        Clone
 *        Load
 *        LoadPages
 *        DeleteMany
 * TODO: Create DocumentRepository to
 *       call documentService as strapi.document(uid, {}).method()
 * TODO: Webhooks
 * TODO: Audit logs
 * TODO: File upload
 * TODO: Transactions?
 *
 * TODO: replace 'any'
 * CountVersions?
 */

const createDocumentService = ({
  strapi,
  db,
}: {
  strapi: Strapi;
  db: Database;
  eventHub: EventHub;
  entityValidator: EntityValidator;
}): DocumentService.DocumentService => ({
  uploadFiles,

  async findMany(uid, params) {
    const { kind } = strapi.getModel(uid);

    const query = transformParamsToQuery(uid, params || ({} as any));

    if (kind === 'singleType') {
      return db.query(uid).findOne(query);
    }

    return db.query(uid).findMany(query);
  },

  async findPage(uid, paginationParams) {
    const query = transformParamsToQuery(uid, paginationParams || ({} as any));
    return db.query(uid).findPage(query) as any;
  },

  async findFirst(uid, params) {
    const query = transformParamsToQuery(uid, params || ({} as any));
    return db.query(uid).findOne(query);
  },

  async findOne(uid, documentId, params) {
    const query = transformParamsToQuery(uid, params || ({} as any));
    return db.query(uid).findOne({ ...query, where: { ...query.where, documentId } });
  },

  // NOTE: What happens if user doesn't provide specific publications state and locale to delete?
  async delete(uid, documentId, params) {
    const query = transformParamsToQuery(uid, params || ({} as any));

    // Find entry to delete
    const entryToDelete = await db
      .query(uid)
      .findOne({ ...query, where: { documentId, ...query?.where } });

    if (!entryToDelete) {
      return null;
    }

    // Delete entry
    await db.query(uid).delete({ where: { id: entryToDelete.id } });
    return entryToDelete;
  },

  // TODO: should we provide two separate methods?
  async deleteMany(uid, paramsOrIds) {
    let queryParams;
    if (isArray(paramsOrIds)) {
      queryParams = { filter: { where: { documentID: { $in: paramsOrIds } } } };
    } else {
      queryParams = paramsOrIds;
    }

    const query = transformParamsToQuery(uid, queryParams || ({} as any));

    return db.query(uid).deleteMany(query);
  },

  async create(uid, params) {
    // TODO: File upload - Probably in the lifecycles?
    const { data } = params;

    if (!data) {
      throw new Error('Create requires data attribute');
    }

    // select / populate
    const query = transformParamsToQuery(uid, pickSelectionParams(params));

    return db.query(uid).create({ ...query, data });
  },

  // NOTE: What happens if user doesn't provide specific publications state and locale to update?
  async update(uid, documentId, params) {
    const { data } = params || {};

    const query = transformParamsToQuery(uid, pickSelectionParams(params || {}));

    const entryToUpdate = await db
      .query(uid)
      .findOne({ ...query, where: { documentId, ...query?.where } });

    if (!entryToUpdate) {
      return null;
    }

    return db.query(uid).update({ ...query, where: { id: entryToUpdate.id }, data });
  },

  async count(uid, params = undefined) {
    const query = transformParamsToQuery(uid, pickSelectionParams(params || {}));

    return db.query(uid).count(query) as any;
  },

  async clone(uid, documentId, params) {
    // TODO: Transform params to query
    return db.query(uid).clone(documentId, params || {});
  },

  async publish(uid, documentId, params) {
    // const { locales } = params || { locales: [] };

    // Find all version of documents of the requested locales
    const draftVersions = await db.query(uid).findMany({
      where: {
        documentId,
        publishedAt: null,
        // locales: { $in: locales },
      },
    });

    // TODO: Throw error?
    if (!draftVersions.length) {
      return null;
    }

    await strapi.db?.transaction(async () =>
      // Clone every draft version to be published
      mapAsync(draftVersions, (draftVersion: any) => {
        // @ts-expect-error - publishedAt is not allowed
        return this.clone(uid, draftVersion.id, { ...params, data: { published_at: new Date() } });
      })
    );

    return draftVersions.length;
  },
});

export default (ctx: {
  strapi: Strapi;
  db: Database;
  eventHub: EventHub;
  entityValidator: EntityValidator;
}): DocumentService.DocumentService => {
  const implementation = createDocumentService(ctx);

  // TODO: Wrap with database error handling
  return implementation;
};
