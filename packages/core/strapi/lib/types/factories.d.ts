import { GenericService, CollectionTypeService, SingleTypeService } from '../core-api/service';
import {
  CollectionTypeController,
  SingleTypeController,
  Controller,
  GenericController,
} from '../core-api/controller';
import { Middleware } from '../middlewares';
import { Policy } from '../core/registries/policies';
import { Strapi } from './core/strapi';
import { SchemaUID } from './utils';
import { UID } from './core';

type HandlerConfig = {
  auth?: false | { scope: string[] };
  policies?: Array<string | Policy | { name: string; config: object }>;
  middlewares?: Array<string | Middleware | { name: string; config: object }>;
};

type SingleTypeRouterConfig = {
  find?: HandlerConfig;
  update?: HandlerConfig;
  delete?: HandlerConfig;
};

type CollectionTypeRouterConfig = {
  find?: HandlerConfig;
  findOne?: HandlerConfig;
  create?: HandlerConfig;
  update?: HandlerConfig;
  delete?: HandlerConfig;
};

type RouterConfig<T = SingleTypeRouterConfig | CollectionTypeRouterConfig> = {
  prefix?: string;
  // TODO Refactor when we have a controller registry
  only?: string[];
  except?: string[];
  config: T;
};

interface Route {
  method: string;
  path: string;
}
interface Router {
  prefix: string;
  routes: Route[];
}

type ControllerCallback<T extends GenericController = GenericController> = (params: {
  strapi: Strapi;
}) => T;
type ServiceCallback<T extends GenericService = GenericService> = (params: { strapi: Strapi }) => T;

export declare function createCoreRouter<T extends UID.ContentType>(
  uid: T,
  cfg?: RouterConfig<T> = {}
): () => Router;

export declare function createCoreController<
  T extends UID.Controller,
  S extends Partial<GetBaseSchemaController<T>>
>(uid: T, cfg?: ControllerCallback<S> | S): () => Required<S & GetBaseSchemaController<T>>;

export declare function createCoreService<
  T extends UID.ContentType,
  S extends Partial<GetBaseSchemaService<T>>
>(uid: T, cfg?: ServiceCallback<S> | S): () => Required<S & GetBaseSchemaService<T>>;

type GetBaseSchemaController<T extends UID.Controller> = IsCollectionType<
  T,
  CollectionTypeController,
  SingleTypeController
> &
  GenericController;

type GetBaseSchemaService<T extends UID.ContentType> = IsCollectionType<
  T,
  CollectionTypeService,
  SingleTypeService
> &
  GenericService;

type GetBaseConfig<T extends UID.ContentType> = IsCollectionType<
  T,
  CollectionTypeRouterConfig,
  SingleTypeRouterConfig
>;

type IsCollectionType<T extends UID.ContentType, Y, N> = T extends Strapi.CollectionTypeUIDs
  ? Y
  : N;
