import { errors } from '@strapi/utils';

/**
 * GET /collection-types/:model
 */
export declare namespace Find {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model
 */
export declare namespace Create {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/clone/:sourceId
 */
export declare namespace Create {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
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
  export interface Response {
    data: {};
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
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/:id
 */
export declare namespace Update {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
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
  export interface Response {
    data: {};
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
  export interface Response {
    data: {};
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
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/actions/bulkDelete
 */
export declare namespace BulkDelete {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/actions/bulkPublish
 */
export declare namespace BulkPublish {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}

/**
 * POST /collection-types/:model/actions/bulkUnpublish
 */
export declare namespace BulkUnpublish {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
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
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}

/**
 * GET /collection-types/:model/actions/countManyEntriesDraftRelations
 */
export declare namespace CountManyEntriesDraftRelations {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}
