import type { Modules } from '@strapi/types';
import { type errors } from '@strapi/utils';

/**
 * POST /collection-types/:model/:id/actions/move
 *
 * Places a document right before or after another one in the custom order of its
 * collection type.
 */
export declare namespace MoveDocument {
  export interface Request {
    body: { before: Modules.Documents.ID } | { after: Modules.Documents.ID };
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    id: Modules.Documents.ID;
  }

  export type Response =
    | {
        data: { documentId: Modules.Documents.ID };
        error?: never;
      }
    | {
        data?: never;
        error: errors.ApplicationError | errors.ValidationError | errors.NotFoundError;
      };
}
