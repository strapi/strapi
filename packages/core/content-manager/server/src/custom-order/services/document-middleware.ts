import type { Modules, UID } from '@strapi/types';
import { omit } from 'lodash';

import { POSITION_ATTRIBUTE } from '../constants';
import { isEmptySort } from './utils';

type Context = Modules.Documents.Middleware.Context;

interface Params {
  sort?: unknown;
  data?: Record<string, unknown>;
  documentId?: string;
}

interface CustomOrder {
  isEnabled(uid: string): boolean;
  getTopPosition(uid: UID.ContentType): Promise<number>;
  syncDocumentPosition(uid: UID.ContentType, documentId: string): Promise<void>;
}

const setParams = (context: Context, params: Params) => {
  Object.assign(context, { params });
};

/**
 * Keeps the Document Service in line with the custom order of a content type:
 * documents come back in that order unless a sort is requested, new documents go on top,
 * and the position can only be changed by moving a document.
 */
const createDocumentMiddleware =
  (customOrder: CustomOrder): Modules.Documents.Middleware.Middleware =>
  async (context, next) => {
    if (!customOrder.isEnabled(context.uid)) {
      return next();
    }

    const params = (context.params ?? {}) as Params;

    switch (context.action) {
      case 'findMany':
      case 'findFirst': {
        if (isEmptySort(params.sort)) {
          setParams(context, { ...params, sort: { [POSITION_ATTRIBUTE]: 'asc' } });
        }

        return next();
      }

      case 'create':
      case 'clone': {
        const position = await customOrder.getTopPosition(context.uid);

        setParams(context, { ...params, data: { ...params.data, [POSITION_ATTRIBUTE]: position } });

        return next();
      }

      case 'update': {
        if (params.data && POSITION_ATTRIBUTE in params.data) {
          setParams(context, { ...params, data: omit(params.data, POSITION_ATTRIBUTE) });
        }

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
