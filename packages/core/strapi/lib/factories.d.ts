import type { Common, CoreApi, Strapi } from '@strapi/strapi';

type WithStrapiCallback<T> = <S extends { strapi: Strapi }>(params: S) => T;

// type HandlerConfig = {
//   auth?: false | { scope: string[] };
//   policies?: Array<string | Policy | { name: string; config: object }>;
//   middlewares?: Array<string | Middleware | { name: string; config: object }>;
// };

// type SingleTypeRouterConfig = {
//   find?: HandlerConfig;
//   update?: HandlerConfig;
//   delete?: HandlerConfig;
// };

// type CollectionTypeRouterConfig = {
//   find?: HandlerConfig;
//   findOne?: HandlerConfig;
//   create?: HandlerConfig;
//   update?: HandlerConfig;
//   delete?: HandlerConfig;
// };

// type RouterConfig<T = SingleTypeRouterConfig | CollectionTypeRouterConfig> = {
//   prefix?: string;
//   // TODO Refactor when we have a controller registry
//   only?: string[];
//   except?: string[];
//   config: T;
// };

// interface Route {
//   method: string;
//   path: string;
// }
// interface Router {
//   prefix: string;
//   routes: Route[];
// }

// export declare function createCoreRouter<T extends UID.ContentType>(
//   uid: T,
//   cfg?: RouterConfig<T> = {}
// ): () => Router;

export declare function createCoreController<
  T extends Common.UID.ContentType,
  S extends Partial<CoreApi.Controller.Extendable<T>>
>(
  uid: T,
  config?: WithStrapiCallback<S> | S
): () => Required<S & CoreApi.Controller.ContentType<T>>;

// export declare function createCoreService<
//   T extends Common.UID.ContentType,
//   S extends Partial<CoreApi.Service.Extendable<T>>
// >(uid: T, config?: WithStrapiCallback<S> | S): () => Required<S & CoreApi.Service.ContentType<T>>;

// type GetBaseSchemaController<T extends UID.ContentType> = IsCollectionType<
//   T,
//   CollectionTypeController,
//   SingleTypeController
// > &
//   GenericController;

// type GetBaseSchemaService<T extends UID.ContentType> = IsCollectionType<
//   T,
//   CollectionTypeService,
//   SingleTypeService
// > &
//   GenericService;

// type GetBaseConfig<T extends UID.ContentType> = IsCollectionType<
//   T,
//   CollectionTypeRouterConfig,
//   SingleTypeRouterConfig
// >;

// type IsCollectionType<T extends UID.ContentType, Y, N> = T extends Strapi.CollectionTypeUIDs
//   ? Y
// : N;
