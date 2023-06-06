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
export type CollectionType = Base & {
  find?(params: object): Promise<Entity[]> | Entity;
  findOne?(entityId: string, params: object): Promise<Entity> | Entity;
  create?(params: object): Promise<Entity> | Entity;
  update?(entityId: string, params: object): Promise<Entity> | Entity;
  delete?(entityId: string, params: object): Promise<Entity> | Entity;
};

/**
 * Core-API single type service
 */
export type SingleType = Base & {
  find?(params: object): Promise<Entity> | Entity;
  createOrUpdate?(params: object): Promise<Entity> | Entity;
  delete?(params: object): Promise<Entity> | Entity;
};

export type ContentType<T extends Common.UID.ContentType> = Utils.Expression.IfElse<
  Common.UID.IsCollectionType<T>,
  CollectionType,
  SingleType
>;

export type Extendable<T extends Common.UID.ContentType> = ContentType<T> & Generic;
