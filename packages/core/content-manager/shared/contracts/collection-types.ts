import { errors } from '@strapi/utils';
import { Schema, Common, EntityService, Documents } from '@strapi/types';

// Admin entity response follows the same format as the entity service
type Document = Documents.Result<Common.UID.Schema>;
type PaginatedDocuments = Documents.PaginatedResult<Common.UID.Schema>;

type PaginationQuery = Documents.Params.Pagination.PageNotation;
type SortQuery = Documents.Params.Sort.StringNotation<Common.UID.Schema> & string;

type PublicationState = Documents.Params.PublicationState.Kind;

/**
 * GET /collection-types/:model
 */
export declare namespace Find {
  export interface Request {
    body: {};
    query: {
      page: PaginationQuery['page'];
      pageSize: PaginationQuery['pageSize'];
      sort: SortQuery;
    };
  }

  export interface Params {
    model: string;
  }

  export interface Response {
    data: {
      results: PaginatedDocuments;
      pagination: {
        page: PaginationQuery['page'];
        pageSize: PaginationQuery['pageSize'];
        pageCount: number;
        total: number;
      };
    };
    error?: errors.ApplicationError;
  }
}

/**
 * GET /collection-types/:model/:id
 */
export declare namespace FindOne {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    model: string;
    id: number;
  }

  export interface Response {
    data: Document;
    meta: {
      availableStatus: PublicationState[];
      availableLocales: string[];
    };
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
    meta: {
      availableStatus: PublicationState[];
      availableLocales: string[];
    };
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
    sourceId: number;
  }

  export interface Response {
    data: Document;
    meta: {
      availableStatus: PublicationState[];
      availableLocales: string[];
    };
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/clone/:sourceId
 */
export declare namespace Clone {
  export interface Request {
    body: Schema.Attributes;
    query: {};
  }

  export interface Params {
    model: string;
    sourceId: number;
  }

  export interface Response {
    data: Document;
    meta: {
      availableStatus: PublicationState[];
      availableLocales: string[];
    };
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/:id
 */
export declare namespace Update {
  export interface Request {
    body: Document;
    query: {};
  }

  export interface Params {
    model: string;
    id: number;
  }

  export interface Response {
    data: Document;
    meta: {
      availableStatus: PublicationState[];
      availableLocales: string[];
    };
    error?: errors.ApplicationError;
  }
}

/**
 * DELETE /collection-types/:model/:id
 */
export declare namespace Delete {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    model: string;
    id: number;
  }

  export interface Response {
    data: Document;
    meta: {
      availableStatus: PublicationState[];
      availableLocales: string[];
    };
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/:id/actions/publish
 */
export declare namespace Publish {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    model: string;
    id: number;
  }

  export interface Response {
    data: Document;
    meta: {
      availableStatus: PublicationState[];
      availableLocales: string[];
    };
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/:id/actions/unpublish
 */
export declare namespace Unpublish {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    model: string;
    id: number;
  }

  export interface Response {
    data: Document;
    meta: {
      availableStatus: PublicationState[];
      availableLocales: string[];
    };
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/actions/bulkDelete
 */
export declare namespace BulkDelete {
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
 * POST /collection-types/:model/actions/bulkPublish
 */
export declare namespace BulkPublish {
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
    query: {};
  }

  export interface Params {
    model: string;
  }

  export interface Response {
    data: {
      data: number;
    };
    error?: errors.ApplicationError;
  }
}

/**
 * GET /collection-types/:model/actions/countManyEntriesDraftRelations
 */
export declare namespace CountManyEntriesDraftRelations {
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
      data: number;
    };
    error?: errors.ApplicationError;
  }
}
