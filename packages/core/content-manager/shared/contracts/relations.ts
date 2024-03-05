import { Documents, Entity, EntityService } from '@strapi/types';
import { errors } from '@strapi/utils';

type PaginationQuery = EntityService.Params.Pagination.PageNotation;

export type RelationResult = {
  documentId: Documents.ID;
  publishedAt: string | null;
  locale?: Documents.Params.Locale;
  [key: string]: unknown;
};

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
      error: errors.ApplicationError | errors.YupValidationError;
    };

/**
 * GET /relations/:model/:targetField
 */
export declare namespace FindAvailable {
  export interface Params {
    model: string;
    targetField: string;
  }

  export interface Request {
    body: {};
    query: Partial<Pick<Pagination, 'pageSize' | 'page'>> & {
      id?: Entity.ID;
      locale?: Documents.Params.Locale;
      _filter?: string;
      _q?: string;
      idsToOmit?: Documents.ID[];
      idsToInclude?: Documents.ID[];
    };
  }

  export type Response = RelationResponse;
}

/**
 * GET /relations/:model/:id/:targetField
 */
export declare namespace FindExisting {
  export interface Params {
    model: string;
    targetField: string;
    id?: Entity.ID;
  }

  export interface Request {
    body: {};
    query: Partial<Pick<Pagination, 'pageSize' | 'page'>> & {
      locale?: string | null;
      _filter?: string;
      _q?: string;
      idsToOmit?: Documents.ID[];
      idsToInclude?: Documents.ID[];
    };
  }

  export type Response = RelationResponse;
}
