import { EntityService, Common } from '@strapi/types';

import { errors } from '@strapi/utils';

type Entity = EntityService.Result<Common.UID.Schema>;

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
    data: Entity;
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /single-types/:model
 */
export declare namespace CreateOrUpdate {
  export interface Request {
    body: Entity;
    query: {
      plugins: {
        i18n: {
          locale: string;
        };
      };
    };
  }

  export interface Response {
    data: Entity;
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
    data: Entity;
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
    data: Entity;
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
    data: Entity;
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
