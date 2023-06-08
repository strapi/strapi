import type { Common, Utils } from '@strapi/strapi';

// TODO Use actual entities instead of regular object
type Entity = object;

/**
 * Base Core-API service type
 */
export interface Base {
  getFetchParams?(params: object): object;
}

/**
 * Generic service structure
 */
export type Generic = {
  [method: string | number | symbol]: (...args: any) => any;
};

/**
 * Core-API collection type service
 */
export interface CollectionType extends Base {
  find?(params: object): Promise<Entity[]> | Entity;
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

export type ContentType<T extends Common.UID.ContentType> = Utils.Expression.MatchFirst<
  [
    Utils.Expression.Test<Common.UID.IsCollectionType<T>, CollectionType>,
    Utils.Expression.Test<Common.UID.IsSingleType<T>, SingleType>
  ],
  Base
>;

export type Extendable<T extends Common.UID.ContentType> = ContentType<T> & Generic;
