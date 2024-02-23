import { Documents, Entity, EntityService } from '@strapi/types';
import { errors } from '@strapi/utils';

type PaginationQuery = EntityService.Params.Pagination.PageNotation;

export interface RelationResult {
  id: Entity.ID;
  publishedAt: string | null;
}

export interface Pagination {
  page: NonNullable<PaginationQuery['page']>;
  pageSize: NonNullable<PaginationQuery['pageSize']>;
  pageCount: number;
  total: number;
}

type RelationResponse =
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

/**
 * GET /relations/:model/:targetField
 */
export declare namespace FindAvailable {
  export interface Request {
    body: {};
    query: Partial<Pick<Pagination, 'pageSize' | 'page'>> & {
      _q?: string;
      _filter?: string;
      id: string;
      locale?: string | null;
      status: Documents.Params.PublicationState.Kind;
    };
  }

  export interface Params {
    model: string;
    targetField: string;
  }

  export type Response = RelationResponse;
}

/**
 * GET /relations/:model/:id/:targetField
 */
export declare namespace FindExisting {
  export interface Request {
    body: {};
    query: Partial<Pick<Pagination, 'pageSize' | 'page'>> & {
      locale?: string | null;
      status: Documents.Params.PublicationState.Kind;
    };
  }

  export interface Params {
    model: string;
    targetField: string;
    id: string;
  }

  export type Response = RelationResponse;
}
