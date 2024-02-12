import { errors } from '@strapi/utils';
import { Schema, Common, Documents } from '@strapi/types';

type PaginatedDocuments = Documents.PaginatedResult<Common.UID.Schema>;
type PaginationQuery = Documents.Params.Pagination.PageNotation;
type SortQuery = Documents.Params.Sort.StringNotation<Common.UID.Schema> & string;

// Admin document response follows the same format as the document service
type Document = Documents.Document<any>;
type AT_FIELDS = 'updatedAt' | 'createdAt' | 'publishedAt';
export type DocumentMetadata = {
  // All status of the returned locale
  availableStatus: Pick<Document, 'id' | AT_FIELDS | 'status'>[];
  // Available locales within the same status of the returned document
  availableLocales: Pick<Document, 'id' | 'locale' | AT_FIELDS | 'status'>[];
};

/**
 * GET /collection-types/:model
 */
export declare namespace Find {
  export interface Request {
    body: {};
    query: {
      page?: string;
      pageSize?: string;
      sort?: SortQuery;
    };
  }

  export interface Params {
    model: string;
  }

  export interface Response extends PaginatedDocuments {
    error?: errors.ApplicationError;
  }
}

/**
 * GET /collection-types/:model/:id
 */
export declare namespace FindOne {
  export interface Request {
    body: {};
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    id: Documents.ID;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model
 */
export declare namespace Create {
  export interface Request {
    body: Schema.Attributes;
    query: {};
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
 * POST /collection-types/:model/auto-clone/:sourceId
 */
export declare namespace AutoClone {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    model: string;
    sourceId: Documents.ID;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/clone/:sourceId
 */
export declare namespace Clone {
  export interface Request {
    body: Schema.Attributes;
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    sourceId: Documents.ID;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/:id
 */
export declare namespace Update {
  export interface Request {
    body: Partial<Document>;
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    id: Documents.ID;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * DELETE /collection-types/:model/:id
 */
export declare namespace Delete {
  export interface Request {
    body: {};
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    id: Documents.ID;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/actions/publish
 */
export declare namespace PublishAndCreate {
  export interface Request {
    body: Document;
    query: {
      locale?: string | null;
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
 * POST /collection-types/:model/:id/actions/publish
 */
export declare namespace Publish {
  export interface Request {
    body: Document;
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    id: Documents.ID;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/:id/actions/unpublish
 */
export declare namespace Unpublish {
  export interface Request {
    body: {};
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    id: Documents.ID;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/:id/actions/discard
 */
export declare namespace Discard {
  export interface Request {
    body: {};
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    id: Documents.ID;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/actions/bulkDelete
 */
export declare namespace BulkDelete {
  export interface Request {
    body: {
      ids: string[];
    };
    query: {};
  }

  export interface Params {
    model: string;
  }

  export interface Response {
    data: {
      count: number;
    };
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * POST /collection-types/:model/actions/bulkPublish
 */
export declare namespace BulkPublish {
  export interface Request {
    body: {
      ids: Documents.ID[];
    };
    query: {};
  }

  export interface Params {
    model: string;
  }

  export interface Response {
    count: number;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * POST /collection-types/:model/actions/bulkUnpublish
 */
export declare namespace BulkUnpublish {
  export interface Request {
    body: {
      ids: number[];
    };
    query: {};
  }

  export interface Params {
    model: string;
  }

  export interface Response {
    data: {
      count: number;
    };
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * GET /collection-types/:model/:id/actions/countDraftRelations
 */
export declare namespace CountDraftRelations {
  export interface Request {
    body: {};
    query: {
      locale?: string | null;
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

/**
 * GET /collection-types/:model/actions/countManyEntriesDraftRelations
 */
export declare namespace CountManyEntriesDraftRelations {
  export interface Request {
    body: {};
    query: {
      ids?: Array<Document['id']>;
      locale?: string;
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
