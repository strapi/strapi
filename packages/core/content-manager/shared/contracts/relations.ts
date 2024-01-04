import { Entity, EntityService } from '@strapi/types';
import { errors } from '@strapi/utils';

type PaginationQuery = EntityService.Params.Pagination.PageNotation;

export interface RelationResult {
  id: Entity.ID;
  publishedAt: string | null;
}

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

  export type Response =
    | {
        results: RelationResult[];
        pagination: {
          page: NonNullable<PaginationQuery['page']>;
          pageSize: NonNullable<PaginationQuery['pageSize']>;
          pageCount: number;
          total: number;
        };
        error?: never;
      }
    | {
        results?: never;
        pagination?: never;
        error?: errors.ApplicationError | errors.YupValidationError;
      };
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

  export type Response =
    | {
        results: RelationResult[];
        pagination: {
          page: NonNullable<PaginationQuery['page']>;
          pageSize: NonNullable<PaginationQuery['pageSize']>;
          pageCount: number;
          total: number;
        };
        error?: never;
      }
    | {
        data: RelationResult;
        error?: never;
      }
    | {
        data?: never;
        error: errors.ApplicationError | errors.YupValidationError;
      };
}
