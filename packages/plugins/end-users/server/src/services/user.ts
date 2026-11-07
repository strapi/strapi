import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { USER_UID } from '../constants';

/** What a `me` route passes on of the request's query: the parts that shape one entry. */
export interface MeQuery {
  fields?: unknown;
  populate?: unknown;
}

interface Documents {
  findOne(params: { documentId: string; fields?: unknown; populate?: unknown }): Promise<unknown>;
}

/**
 * The core service of the end-user type (`find`, `findOne`, `create`, `update`, `delete`: what the
 * core controller behind `/api/users` calls), with the one method the `me` route adds.
 */
export default factories.createCoreService(USER_UID, ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * The signed-in user, by the `documentId` the strategy put on the request: never one the request
   * sent. Only `fields` and `populate` of the query apply; filters, sort and pagination mean
   * nothing for one entry.
   */
  async findMe(userDocumentId: string, query: MeQuery = {}) {
    // An empty value would be dropped from the lookup, and the lookup would match any user
    if (typeof userDocumentId !== 'string' || userDocumentId === '') {
      throw new errors.UnauthorizedError();
    }

    const { fields, populate } = query;

    return (strapi.documents(USER_UID) as unknown as Documents).findOne({
      documentId: userDocumentId,
      ...(fields !== undefined && { fields }),
      ...(populate !== undefined && { populate }),
    });
  },
}));
