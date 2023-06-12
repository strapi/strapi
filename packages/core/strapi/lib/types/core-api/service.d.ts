import type { Common, Utils } from '@strapi/strapi';

// TODO Use actual entities instead of regular object
type Entity = unknown;

/**
 * Base Core-API service type
 */
export interface Base {
  getFetchParams?(params: object): object;
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
  find?(params: object): Promise<Entity[]> | Entity[];
  findOne?(entityId: string, params: object): Promise<Entity> | Entity;
  create?(params: object): Promise<Entity> | Entity;
  update?(entityId: string, params: object): Promise<Entity> | Entity;
  delete?(entityId: string, params: object): Promise<Entity> | Entity;
}

/**
 * Core-API single type service
 */
export interface SingleType extends Base {
  find?(params: object): Promise<Entity> | Entity;
  createOrUpdate?(params: object): Promise<Entity> | Entity;
  delete?(params: object): Promise<Entity> | Entity;
}

export type ContentType<TContentTypeUID extends Common.UID.ContentType> =
  Utils.Expression.MatchFirst<
    [
      Utils.Expression.Test<Common.UID.IsCollectionType<TContentTypeUID>, CollectionType>,
      Utils.Expression.Test<Common.UID.IsSingleType<TContentTypeUID>, SingleType>
    ],
    Base
  >;

export type Extendable<TContentTypeUID extends Common.UID.ContentType> =
  ContentType<TContentTypeUID> & Generic;
