import { EntityService, Schema } from '@strapi/types';
import { errors } from '@strapi/utils';

type PaginationQuery = EntityService.Params.Pagination.PageNotation;

type RelationResult = Schema.Attributes & {
  id: number;
  publishedAt: string | null;
};

/**
 * GET /relations/:model/:targetField
 */
export declare namespace FindAvailable {
  export interface Request {
    body: {};
    query: {
      pageSize: PaginationQuery['pageSize'];
      page: PaginationQuery['page'];
    };
  }

  export interface Params {
    model: string;
    targetField: string;
  }

  export interface Response {
    data: {
      results: RelationResult[];
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
 * GET /relations/:model/:id/:targetField
 */
export declare namespace FindExisting {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    model: string;
    targetField: string;
    id: number;
  }

  export interface Response {
    data: {
      data: RelationResult;
    };
    error?: errors.ApplicationError;
  }
}
