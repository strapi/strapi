import type { Data, UID } from '@strapi/types';
import { type errors } from '@strapi/utils';

/**
 * GET /content-manager/preview/url/:uid
 */
export declare namespace GetPreviewUrl {
  export interface Request {
    params: {
      contentType: UID.ContentType;
    };
    query: {
      documentId?: Data.DocumentID;
      locale?: string;
      status?: 'published' | 'draft';
    };
  }

  // NOTE: Response status will be 204 if no URL is found
  export type Response =
    | {
        data: {
          url: string | undefined;
        };
        error?: never;
      }
    | {
        data?: never;
        error: errors.ApplicationError | errors.ValidationError | errors.NotFoundError;
      };
}
