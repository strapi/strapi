import type { Data, UID } from '@strapi/types';
import { errors } from '@strapi/utils';
import { Entity } from './shared';

export interface AILocalizationJobs extends Entity {
  contentType: UID.ContentType;
  relatedDocumentId: Data.DocumentID;
  sourceLocale: string;
  targetLocales: string[];
  status: 'processing' | 'completed' | 'failed';
}

/**
 * GET /i18n/ai-localization-jobs/document/:documentId - Get AI localization jobs by document ID
 */
export declare namespace GetAILocalizationJobsByDocument {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Params {
    documentId: Data.DocumentID;
  }

  export type Response =
    | {
        data: AILocalizationJobs;
      }
    | {
        data: null;
        error: errors.ApplicationError;
      };
}
