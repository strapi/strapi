import type { Common, Utils, Entity as E } from '..';

type EntityID = E.ID;

// TODO Use actual entities instead of regular object
type Entity = { id: EntityID } & Record<string, unknown>;

type PaginatedEntities = {
  results: Entity[];
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
  findOne(entityId: EntityID, params: object): Promise<Entity | null>;
  create(params: { data: Data; [key: string]: unknown }): Promise<Entity>;
  update(
    entityId: EntityID,
    params: { data: Data; [key: string]: unknown }
  ): Promise<Entity> | Entity;
  delete(entityId: EntityID, params: object): Promise<Entity> | Entity;
}

/**
 * Core-API single type service
 */
export interface SingleType extends Base {
  find(params: object): Promise<Entity> | Entity;
  createOrUpdate(params: { data: Data; [key: string]: unknown }): Promise<Entity> | Entity;
  delete(params: object): Promise<Entity> | Entity;
}

export type ContentType<TContentTypeUID extends Common.UID.ContentType> =
  Utils.Expression.MatchFirst<
    [
      Utils.Expression.Test<Common.UID.IsCollectionType<TContentTypeUID>, CollectionType>,
      Utils.Expression.Test<Common.UID.IsSingleType<TContentTypeUID>, SingleType>
    ],
    Base
  >;

export type Extendable<TContentTypeUID extends Common.UID.ContentType> = Partial<
  ContentType<TContentTypeUID>
> &
  Generic;
