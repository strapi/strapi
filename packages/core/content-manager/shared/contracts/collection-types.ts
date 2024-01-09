import { errors } from '@strapi/utils';
import { Schema, Common, EntityService } from '@strapi/types';

// Admin entity response follows the same format as the entity service
type Entity = EntityService.Result<Common.UID.Schema>;
type PaginatedEntities = EntityService.PaginatedResult<Common.UID.Schema>;

type PaginationQuery = EntityService.Params.Pagination.PageNotation;
type SortQuery = EntityService.Params.Sort.StringNotation<Common.UID.Schema> & string;

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
    results: PaginatedEntities['results'];
    pagination: PaginatedEntities['pagination'];
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
    data: Entity;
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
    data: Entity;
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
    sourceId: Entity['id'];
  }

  export type Response =
    | Entity
    | {
        error?: errors.ApplicationError;
      };
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
    data: Entity;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/:id
 */
export declare namespace Update {
  export interface Request {
    body: Entity;
    query: {};
  }

  export interface Params {
    model: string;
    id: number;
  }

  export interface Response {
    data: Entity;
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
    id: Entity['id'];
  }

  export interface Response {
    data: Entity;
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
    data: Entity;
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
    id: Entity['id'];
  }

  export interface Response {
    data: Entity;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/actions/bulkDelete
 */
export declare namespace BulkDelete {
  export interface Request {
    body: {
      ids: Entity['id'][];
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
      ids: Entity['id'][];
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
      ids: Entity['id'][];
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
    data: number;
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
    data: number;
    error?: errors.ApplicationError;
  }
}
