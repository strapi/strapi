import type * as UID from '../../uid';
import type * as Utils from '../../utils';

import type { Documents } from '../../modules';

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
  [key: keyof any]: unknown;
};

/**
 * Core-API collection type service
 */
export interface CollectionType extends Base {
  find(params: object): Promise<PaginatedEntities>;
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
