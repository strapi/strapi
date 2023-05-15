import {
  Service,
  GenericService,
  CollectionTypeService,
  SingleTypeService,
} from '../core-api/service';
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
import { GenericService } from '../core-api/service/index';

type ControllerConfig<T extends Controller = Controller> = T;

type ServiceConfig = Service;

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

type RouterConfig = {
  prefix?: string;
  only?: string[];
  except?: string[];
  config: SingleTypeRouterConfig | CollectionTypeRouterConfig;
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

export function createCoreRouter(uid: string, cfg?: RouterConfig = {}): () => Router;

export function createCoreController<
  T extends SchemaUID,
  S extends Partial<GetBaseSchemaController<T>>
>(uid: T, cfg?: ControllerCallback<S> | S): () => Required<S & GetBaseSchemaController<T>>;

export function createCoreService<T extends SchemaUID, S extends Partial<GetBaseSchemaService<T>>>(
  uid: T,
  cfg?: ServiceCallback<S> | S
): () => Required<S & GetBaseSchemaService<T>>;

type GetBaseSchemaController<T extends SchemaUID> =
  Strapi.Schemas[T]['kind'] extends 'collectionType'
    ? CollectionTypeController & GenericController
    : SingleTypeController & GenericController;

type GetBaseSchemaService<T extends SchemaUID> = Strapi.Schemas[T]['kind'] extends 'collectionType'
  ? CollectionTypeService & GenericService
  : SingleTypeService & GenericService;
