import type { Data } from '@strapi/types';
import { type errors } from '@strapi/utils';

/**
 * POST /collection-types/:model/:id/actions/move
 *
 * Places a document right before or after another one in the custom order of its
 * collection type.
 */
export declare namespace MoveDocument {
  export interface Request {
    body: { before: Data.DocumentID } | { after: Data.DocumentID };
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    id: Data.DocumentID;
  }

  export type Response =
    | {
        data: { documentId: Data.DocumentID };
        error?: never;
      }
    | {
        data?: never;
        error: errors.ApplicationError | errors.ValidationError | errors.NotFoundError;
      };
}
