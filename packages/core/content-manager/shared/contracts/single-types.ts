import type { Modules } from '@strapi/types';

import { errors } from '@strapi/utils';

type Document = Modules.Documents.Document<any>;
type AT_FIELDS = 'updatedAt' | 'createdAt' | 'publishedAt';
type BY_FIELDS = 'createdBy' | 'updatedBy' | 'publishedBy';
type DocumentMetadata = {
  // All status of the returned locale
  availableStatus: Pick<Document, 'id' | BY_FIELDS | AT_FIELDS>[];
  // Available locales within the same status of the returned document
  availableLocales: Pick<Document, 'id' | 'locale' | 'status' | AT_FIELDS>[];
};

/**
 * GET /single-types/:model
 */
export declare namespace Find {
  export interface Request {
    body: {};
    query: {
      locale: string;
    };
  }

  export interface Params {
    model: string;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /single-types/:model
 */
export declare namespace CreateOrUpdate {
  export interface Request {
    body: Document;
    query: {
      plugins: {
        i18n: {
          locale: string;
        };
      };
    };
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * DELETE /single-types/:model
 */
export declare namespace Delete {
  export interface Request {
    body: {};
    query: {
      locale: string;
    };
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /single-types/:model/actions/publish
 */
export declare namespace Publish {
  export interface Request {
    body: {};
    query: {
      locale: string;
    };
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /single-types/:model/actions/unpublish
 */
export declare namespace UnPublish {
  export interface Request {
    body: {
      // Discards the draft version before un-publishing, so the document is be reverted to the last published version.
      // Default: false
      discardDraft?: boolean; // Defaults to false
    };
    query: {
      locale: string;
    };
  }
  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * GET /single-types/:model/actions/countDraftRelations
 */
export declare namespace CountDraftRelations {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: number;
    error?: errors.ApplicationError;
  }
}
