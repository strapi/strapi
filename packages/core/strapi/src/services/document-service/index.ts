import type { Strapi, DocumentService, EntityValidator, EventHub } from '@strapi/types';
import { convertQueryParams } from '@strapi/utils';
import type { Database } from '@strapi/database';

import uploadFiles from '../utils/upload-files';
import { pickSelectionParams } from './params';

const { transformParamsToQuery } = convertQueryParams;

/**
 * TODO: TESTS
 * TODO: Components
 * TODO: Entity Validation
 * TODO: Lifecycles
 *        Plugin extensions
 * TODO: D&P
 * TODO: i18n
 * TODO: Apply default parameters (status & locale)
 * TODO: Sanitization
 * TODO: Other methods
 *        Count
 *        FindPage
 *        Clone
 *        Load
 *        LoadPages
 *        DeleteMany
 * TODO: Webhooks
 * TODO: Audit logs
 * TODO: File upload
 * TODO: Transactions?
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
      return db.query(uid).findOne(query) as any;
    }

    return db.query(uid).findMany(query) as any;
  },

  async findFirst(uid, params) {
    const query = transformParamsToQuery(uid, params || ({} as any));
    return db.query(uid).findOne(query) as any;
  },

  async findOne(uid, documentId, params) {
    const query = transformParamsToQuery(uid, params || ({} as any));
    return db.query(uid).findOne({ ...query, where: { ...query.where, documentId } }) as any;
  },

  // NOTE: What happens if user doesn't provide specific publications state and locale to delete?
  async delete(uid, documentId, params) {
    const query = transformParamsToQuery(uid, params || ({} as any));

    // Find entry to delete
    const entryToDelete = (await db
      .query(uid)
      .findOne({ ...query, where: { documentId, ...query?.where } })) as any;

    if (!entryToDelete) {
      return null;
    }

    // Delete entry
    await db.query(uid).delete({ where: { id: entryToDelete.id } });
    return entryToDelete;
  },

  async create(uid, params) {
    // TODO: File upload - Probably in the lifecycles?
    const { data } = params;

    if (!data) {
      throw new Error('Create requires data attribute');
    }

    // select / populate
    const query = transformParamsToQuery(uid, pickSelectionParams(params));

    return db.query(uid).create({ ...query, data }) as any;
  },

  // NOTE: What happens if user doesn't provide specific publications state and locale to update?
  async update(uid, documentId, params) {
    const { data } = params || {};

    const query = transformParamsToQuery(uid, pickSelectionParams(params || {}));

    const entryToUpdate = (await db
      .query(uid)
      .findOne({ ...query, where: { documentId, ...query?.where } })) as any;

    if (!entryToUpdate) {
      return null;
    }

    return db.query(uid).update({ ...query, where: { id: entryToUpdate.id }, data }) as any;
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
