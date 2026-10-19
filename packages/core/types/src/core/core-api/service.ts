import type * as UID from '../../uid';
import type * as Utils from '../../utils';

import type { Documents } from '../../modules';
import type { IsStrict } from '../strictness';
import type { Pick as ParamsPick } from '../../modules/documents/params';
import type { StrictResult } from '../../modules/documents/result';
import type { CreateInput } from '../../modules/documents/params/write';

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

/**
 * The params of a core service read, as far as its result depends on them: `fields`, `populate` and
 * `status`. Other params, such as `filters` or `pagination`, are accepted as they are.
 */
type ReadParams<TContentTypeUID extends UID.ContentType> = ParamsPick<
  TContentTypeUID,
  'fields' | 'populate' | 'status'
>;

/**
 * An entry the core service returns, with strict types. The core service calls the Document Service
 * with `{ status: 'published', ...params }`, so it reads published entries unless the params pass a
 * `status`. An explicit `status: undefined` overrides the default, and the Document Service then
 * reads drafts.
 *
 * @see {@link StrictResult} for what the entry guarantees.
 */
export type Entry<TContentTypeUID extends UID.ContentType, TParams> = StrictResult<
  TContentTypeUID,
  TParams,
  'published',
  'draft'
>;

type Data = Record<string, unknown>;

/**
 * The params of a core service `create`, with strict types. The core service calls the Document
 * Service with `{ status: 'published', ...params }` (`core-api/service/core-service.ts:2-7` in
 * `@strapi/core`), so `data` follows the published write rules ({@link CreateInput}) unless the
 * params pass `status: 'draft'`.
 */
type CreateParams<TContentTypeUID extends UID.ContentType> = ReadParams<TContentTypeUID> &
  (
    | { status?: 'published'; data: CreateInput<TContentTypeUID, 'published'> }
    | { status: 'draft'; data: CreateInput<TContentTypeUID, 'draft'> }
  );

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

/**
 * A core collection type service of `TContentTypeUID`, with strict types: its entries follow the
 * strict result model, read as published by default (see {@link Entry}).
 */
export interface StrictCollectionType<TContentTypeUID extends UID.ContentType> extends Base {
  /**
   * `results` holds the entries of the page; `pagination` keeps the notation of the request, with
   * `total` (and `pageCount` for pages) when the service counts the entries.
   */
  find<const TParams extends ReadParams<TContentTypeUID>>(
    params: TParams
  ): Promise<
    Omit<StrictPaginatedEntities, 'results'> & { results: Entry<TContentTypeUID, TParams>[] }
  >;
  /** `null` when no entry of the document matches. */
  findOne<const TParams extends ReadParams<TContentTypeUID>>(
    docId: Documents.ID,
    params: TParams
  ): Promise<Entry<TContentTypeUID, TParams> | null>;
  /**
   * The created entry, published unless the params pass another `status`. `data` follows the write
   * rules of that status (see {@link CreateParams}).
   */
  create<const TParams extends CreateParams<TContentTypeUID>>(
    params: TParams
  ): Promise<Entry<TContentTypeUID, TParams>>;
  /** `null` when the document does not exist. */
  update<const TParams extends ReadParams<TContentTypeUID> & { data: Data }>(
    docId: Documents.ID,
    params: TParams
  ): Promise<Entry<TContentTypeUID, TParams> | null>;
  delete(
    docId: Documents.ID,
    params: object
  ): Promise<{
    deletedEntries: number;
  }>;
}

/**
 * A core single type service of `TContentTypeUID`, with strict types: its entry follows the strict
 * result model, read as published by default (see {@link Entry}).
 */
export interface StrictSingleType<TContentTypeUID extends UID.ContentType> extends Base {
  /** `null` when the single type has no entry. */
  find<const TParams extends ReadParams<TContentTypeUID>>(
    params: TParams
  ): Promise<Entry<TContentTypeUID, TParams> | null>;
  /** Updates the entry, or creates it when there is none. */
  createOrUpdate<const TParams extends ReadParams<TContentTypeUID> & { data: Data }>(
    params: TParams
  ): Promise<Entry<TContentTypeUID, TParams> | null>;
  delete(params: object): Promise<{
    deletedEntries: number;
  }>;
}

/** The core service of `TContentTypeUID`, as typed without strict types. */
type LegacyContentType<TContentTypeUID extends UID.ContentType> = Utils.MatchFirst<
  [
    Utils.Test<UID.IsCollectionType<TContentTypeUID>, CollectionType>,
    Utils.Test<UID.IsSingleType<TContentTypeUID>, SingleType>,
  ],
  Base
>;

/**
 * The core service of `TContentTypeUID`. Without strict types, develop's service types. With strict
 * types, the services typed by the content type ({@link StrictCollectionType},
 * {@link StrictSingleType}).
 */
export type ContentType<TContentTypeUID extends UID.ContentType> = IsStrict extends false
  ? LegacyContentType<TContentTypeUID>
  : Utils.MatchFirst<
      [
        Utils.Test<UID.IsCollectionType<TContentTypeUID>, StrictCollectionType<TContentTypeUID>>,
        Utils.Test<UID.IsSingleType<TContentTypeUID>, StrictSingleType<TContentTypeUID>>,
      ],
      Base
    >;

/**
 * The methods a core service definition may override. Overrides keep the service types of
 * {@link LegacyContentType}, strict types or not: the factory copies a base method only where the
 * definition has none, and the overrides' own types win at call sites.
 */
export type Extendable<TContentTypeUID extends UID.ContentType> = Partial<
  LegacyContentType<TContentTypeUID>
> &
  Generic;
