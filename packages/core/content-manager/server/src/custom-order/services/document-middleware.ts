import type { Modules, UID } from '@strapi/types';
import { omit } from 'lodash';

import { POSITION_ATTRIBUTE } from '../constants';
import { isEmptySort, withTieBreaker } from './utils';

type Context = Modules.Documents.Middleware.Context;

interface Params {
  sort?: unknown;
  data?: Record<string, unknown>;
  documentId?: string;
}

interface CustomOrder {
  isOrderable(uid: string): boolean;
  isEnabled(uid: string): boolean;
  getTopPosition(uid: UID.ContentType): Promise<number>;
  syncDocumentPosition(uid: UID.ContentType, documentId: string): Promise<void>;
  withOrderLock<T>(uid: UID.ContentType, fn: () => Promise<T>): Promise<T>;
}

const setParams = (context: Context, params: Params) => {
  Object.assign(context, { params });
};

const DEFAULT_SORT = { [POSITION_ATTRIBUTE]: 'asc' };

/**
 * Keeps the Document Service in line with the custom order of a content type:
 * documents come back in that order unless a sort is requested, new documents go on top,
 * and the position can only be changed by moving a document.
 */
const createDocumentMiddleware =
  (customOrder: CustomOrder): Modules.Documents.Middleware.Middleware =>
  async (context, next) => {
    if (!customOrder.isOrderable(context.uid)) {
      return next();
    }

    let params = (context.params ?? {}) as Params;

    // The position is not content: whatever a client puts in the data is dropped, whether
    // custom order is on for the content type or not. A value written while it is off would
    // otherwise be taken for a real position once it is turned on.
    if (params.data && POSITION_ATTRIBUTE in params.data) {
      params = { ...params, data: omit(params.data, POSITION_ATTRIBUTE) };
      setParams(context, params);
    }

    if (!customOrder.isEnabled(context.uid)) {
      return next();
    }

    switch (context.action) {
      case 'findMany':
      case 'findFirst': {
        const sort = withTieBreaker(isEmptySort(params.sort) ? DEFAULT_SORT : params.sort);

        if (sort !== params.sort) {
          setParams(context, { ...params, sort });
        }

        return next();
      }

      case 'create':
      case 'clone': {
        // The top position is read then written with the document: under the lock, so that
        // two new documents can't get the same one, and in one transaction with the insert.
        return customOrder.withOrderLock(context.uid, async () => {
          const position = await customOrder.getTopPosition(context.uid);

          setParams(context, {
            ...params,
            data: { ...params.data, [POSITION_ATTRIBUTE]: position },
          });

          return next();
        });
      }

      case 'update': {
        const result = await next();
        const entry = result as Record<string, unknown> | null | undefined;

        // Updating a locale that does not exist yet creates a row without position
        if (entry && params.documentId && (entry[POSITION_ATTRIBUTE] ?? null) === null) {
          await customOrder.syncDocumentPosition(context.uid, params.documentId);
        }

        return result;
      }

      default:
        return next();
    }
  };

export { createDocumentMiddleware };
