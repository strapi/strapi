import type { Common, CoreApi } from '@strapi/strapi';

export declare function createCoreRouter<T extends Common.UID.ContentType>(
  uid: T,
  cfg?: CoreApi.Router.RouterConfig<T>
): () => CoreApi.Router.Router;

// TODO: Find a cleaner way to expose methods for customization
export declare function createCoreController<T extends Common.UID.ContentType>(
  uid: T,
  config?: any
): () => any;

// TODO: Find a cleaner way to expose methods for customization
export declare function createCoreService<T extends Common.UID.ContentType>(
  uid: T,
  config?: any
): () => any;
