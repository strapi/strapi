import type { Common, CoreApi, Strapi } from '@strapi/strapi';

type WithStrapiCallback<T> = <S extends { strapi: Strapi }>(params: S) => T;

export declare function createCoreRouter<T extends Common.UID.ContentType>(
  uid: T,
  cfg?: CoreApi.Router.RouterConfig<T>
): () => CoreApi.Router.Router;

export declare function createCoreController<
  T extends Common.UID.ContentType,
  S extends Partial<CoreApi.Controller.Extendable<T>>
>(
  uid: T,
  config?: WithStrapiCallback<S> | S
): () => Required<S & CoreApi.Controller.ContentType<T>>;

export declare function createCoreService<
  T extends Common.UID.ContentType,
  S extends Partial<CoreApi.Service.Extendable<T>>
>(uid: T, config?: WithStrapiCallback<S> | S): () => Required<S & CoreApi.Service.ContentType<T>>;
