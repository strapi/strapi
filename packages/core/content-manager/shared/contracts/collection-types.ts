import { errors } from '@strapi/utils';
import { Public, Modules, Internal } from '@strapi/types';

type PaginatedDocuments = Modules.Documents.PaginatedResult<Public.UID.Schema>;
type SortQuery = Modules.Documents.Params.Sort.StringNotation<Public.UID.Schema> & string;

// Admin document response follows the same format as the document service
type Document = Modules.Documents.Document<any>;
type AT_FIELDS = 'updatedAt' | 'createdAt' | 'publishedAt';
type BY_FIELDS = 'createdBy' | 'updatedBy' | 'publishedBy';
export type DocumentMetadata = {
  // All status of the returned locale
  availableStatus: Pick<Document, 'id' | BY_FIELDS | AT_FIELDS>[];
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
    id: Modules.Documents.ID;
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
    body: Internal.Struct.SchemaAttributes;
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

export type ProhibitedCloningField = [fieldNames: string[], 'unique' | 'relation'];

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
    sourceId: Modules.Documents.ID;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError<
      'BadRequestError',
      string,
      { prohibitedFields: ProhibitedCloningField[] }
    >;
  }
}

/**
 * POST /collection-types/:model/clone/:sourceId
 */
export declare namespace Clone {
  export interface Request {
    body: Internal.Struct.SchemaAttributes;
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    sourceId: Modules.Documents.ID;
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
    id: Modules.Documents.ID;
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
    id: Modules.Documents.ID;
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
    body: Partial<Document>;
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
    body: Partial<Document>;
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    id: Modules.Documents.ID;
  }

  export interface Response {
    data: Document;
    meta: DocumentMetadata;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/:id/actions/unpublish
 *
 * TODO: Unpublish many locales at once
 */
export declare namespace Unpublish {
  export interface Request {
    body: {
      // Discards the draft version before un-publishing, so the document is be reverted to the last published version.
      // Default: false
      discardDraft?: boolean;
    };
    query: {
      locale?: string | null;
    };
  }

  export interface Params {
    model: string;
    id: Modules.Documents.ID;
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
    id: Modules.Documents.ID;
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
      ids: Modules.Documents.ID[];
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
