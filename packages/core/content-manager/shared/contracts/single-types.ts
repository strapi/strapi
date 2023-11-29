import { Documents, Common } from '@strapi/types';

import { errors } from '@strapi/utils';

type PublicationState = Documents.Params.PublicationState.Kind;

type Document = Documents.Result<Common.UID.Schema>;
type DocumentMetadata = {
  // All status of the returned locale
  availableStatus: Document[];
  // Available locales within the same status of the returned document
  availableLocales: Document[];
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
 * GET /single-types/:model/actions/countDraftRelations
 */
export declare namespace CountDraftRelations {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: {
      data: number;
    };
    error?: errors.ApplicationError;
  }
}
