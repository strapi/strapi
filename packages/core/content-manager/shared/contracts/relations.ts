import { Modules, Data } from '@strapi/types';
import { errors } from '@strapi/utils';

type PaginationQuery = Modules.EntityService.Params.Pagination.PageNotation;

export interface RelationResult {
  id: Data.ID;
  publishedAt: string | null;
}

export interface Pagination {
  page: NonNullable<PaginationQuery['page']>;
  pageSize: NonNullable<PaginationQuery['pageSize']>;
  pageCount: number;
  total: number;
}

/**
 * GET /relations/:model/:targetField
 */
export declare namespace FindAvailable {
  export interface Request {
    body: {};
    query: Partial<Pick<Pagination, 'pageSize' | 'page'>> & { _q?: string; _filter?: string };
  }

  export interface Params {
    model: string;
    targetField: string;
  }

  export type Response =
    | {
        results: RelationResult[];
        pagination: Pagination;
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
    query: Partial<Pick<Pagination, 'pageSize' | 'page'>>;
  }

  export interface Params {
    model: string;
    targetField: string;
    id: string;
  }

  export type Response =
    | {
        results: RelationResult[];
        pagination: Pagination;
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
