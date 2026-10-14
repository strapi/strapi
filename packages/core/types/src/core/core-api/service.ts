import type * as UID from '../../uid';
import type * as Utils from '../../utils';

import type { Documents } from '../../modules';
import type { IsStrict } from '../strictness';

// TODO: Migration to use Documents
type Document = Documents.AnyDocument;

type PaginatedEntities = {
  results: Document[] | null;
  pagination:
    | {
        page: number;
        pageSize: number | null;
        start?: undefined;
        limit?: undefined;
      }
    | {
        start: number;
        limit: number;
        page?: undefined;
        pageSize?: undefined;
      };
};

/**
 * The result of a collection type's `find`, with strict types. `results` is never `null`: the core
 * service resolves the Document Service's `findMany`, an array. `pagination` keeps the notation of
 * the request (`page`/`pageSize` unless `start` or `limit` is passed) and always holds its numbers,
 * defaults included. `total`, and `pageCount` for the page notation, are present when the service
 * counts the entries: unless `pagination.withCount` is false, or `api.rest.withCount` is false and
 * the request does not set it.
 */
type StrictPaginatedEntities = {
  results: Document[];
  pagination:
    | ({ page: number; pageSize: number; start?: undefined; limit?: undefined } & (
        { pageCount: number; total: number } | { pageCount?: undefined; total?: undefined }
      ))
    | ({ start: number; limit: number; page?: undefined; pageSize?: undefined } & (
        { total: number } | { total?: undefined }
      ));
};

/** The result of a collection type's `find`: develop's type without strict types. */
type FindResult = IsStrict extends false ? PaginatedEntities : StrictPaginatedEntities;

type Data = Record<string, unknown>;

/**
 * Base Core-API service type
 */
export interface Base {
  getFetchParams(params: object): object;
}

/**
 * Generic core api service structure
 */
export type Generic = {
  [name: string]: (...args: any[]) => any;
};

/**
 * Core-API collection type service
 */
export interface CollectionType extends Base {
  find(params: object): Promise<FindResult>;
  findOne(docId: Documents.ID, params: object): Promise<Document | null>;
  create(params: { data: Data; [key: string]: unknown }): Promise<Document>;
  update(
    docId: Documents.ID,
    params: { data: Data; [key: string]: unknown }
  ): Promise<Document | null>;
  delete(
    docId: Documents.ID,
    params: object
  ): Promise<{
    deletedEntries: number;
  }>;
}

/**
 * Core-API single type service
 */
export interface SingleType extends Base {
  find(params: object): Promise<Document | null>;
  createOrUpdate(params: { data: Data; [key: string]: unknown }): Promise<Document | null>;
  delete(params: object): Promise<{
    deletedEntries: number;
  }>;
}

export type ContentType<TContentTypeUID extends UID.ContentType> = Utils.MatchFirst<
  [
    Utils.Test<UID.IsCollectionType<TContentTypeUID>, CollectionType>,
    Utils.Test<UID.IsSingleType<TContentTypeUID>, SingleType>,
  ],
  Base
>;

export type Extendable<TContentTypeUID extends UID.ContentType> = Partial<
  ContentType<TContentTypeUID>
> &
  Generic;
