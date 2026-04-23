import type { Data, Modules } from '@strapi/types';
import { errors } from '@strapi/utils';

/**
 * POST /i18n/content-manager/actions/get-non-localized-fields - Get the localized fields
 */
export declare namespace GetNonLocalizedFields {
  export interface Request {
    query: {};
    body: {
      id?: Data.ID;
      locale?: string;
      model: string;
    };
  }

  /**
   * TODO: this should follow the usual `data/error` pattern.
   */
  export interface Response {
    nonLocalizedFields: object;
    localizations: Array<{ id: Data.ID; locale: string; publishedAt: string | null }>;
    error?: errors.ApplicationError;
  }
}

/**
 * GET /i18n/content-manager/get-fill-from-locale - Get data from source locale to fill target locale
 */
export interface FillFromLocaleParams {
  model: string;
  documentId?: string;
  sourceLocale: string;
  targetLocale: string;
  collectionType: 'collection-types' | 'single-types';
}

export declare namespace FillFromLocale {
  export interface Request {
    body: {};
    query: Params;
  }

  export interface Params {
    model: string;
    documentId?: string;
    sourceLocale: string;
    targetLocale: string;
    collectionType: 'collection-types' | 'single-types';
  }

  export interface Response {
    data: Record<string, unknown>;
    error?: errors.ApplicationError;
  }
}

/**
 * GET content-manager/collection-types/:model/actions/countManyEntriesDraftRelations
 */
export declare namespace CountManyEntriesDraftRelations {
  export interface Request {
    body: {};
    query: {
      // We can use this endpoint to count the draft relations across multiple
      // entities (documents + locales).
      documentIds?: Modules.Documents.ID[];
      locale?: string | string[] | null;
    };
  }

  export interface Params {
    model: string;
  }

  export interface Response {
    data: number;
    error?: errors.ApplicationError;
  }
}
