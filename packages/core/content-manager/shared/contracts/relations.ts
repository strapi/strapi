import { Modules, Data } from '@strapi/types';
import { errors } from '@strapi/utils';

type PaginationQuery = Modules.EntityService.Params.Pagination.PageNotation;

export interface RelationResult {
  documentId: Modules.Documents.ID;
  id: number;
  status?: Modules.Documents.Params.PublicationStatus.Kind;
  locale?: Modules.Documents.Params.Locale.StringNotation;
  [key: string]: any;
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
      id?: Data.ID;
      locale?: Modules.Documents.Params.Locale.StringNotation;
      _filter?: string;
      _q?: string;
      idsToOmit?: Modules.Documents.ID[];
      idsToInclude?: Modules.Documents.ID[];
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
    id?: Data.ID;
  }

  export interface Request {
    body: {};
    query: Partial<Pick<Pagination, 'pageSize' | 'page'>> & {
      locale?: string | null;
      _filter?: string;
      _q?: string;
      status?: Modules.Documents.Params.PublicationStatus.Kind;
      idsToOmit?: Modules.Documents.ID[];
      idsToInclude?: Modules.Documents.ID[];
    };
  }

  export type Response = RelationResponse;
}
