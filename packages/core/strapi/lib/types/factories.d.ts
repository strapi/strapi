import { Service } from '../core-api/service';
import { Controller, GenericController } from '../core-api/controller';
import { Middleware } from '../middlewares';
import { Policy } from '../core/registries/policies';
import { Strapi } from '@strapi/strapi'

type ControllerConfig<T extends Controller = Controller> = T;

type ServiceConfig = Service;

type HandlerConfig = {
  auth?: false | { scope: string[] };
  policies?: Array<string | Policy>;
  middlewares?: Array<string | Middleware>;
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
  only: string[];
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

type ControllerCallback <T extends GenericController = GenericController> = (params:{strapi:Strapi}) => T;
type ServiceCallback <T extends Service = Service> = (params:{strapi:Strapi}) => T

export function createCoreRouter(uid: string, cfg?: RouterConfig = {}): () => Router;
export function createCoreController<T extends GenericController = GenericController>(uid: string, cfg?: ControllerCallback<T> | T = {}): () => T & Controller;
export function createCoreService<T extends Service = Service>(uid: string, cfg?: ServiceCallback<T> | T = {}): () => T ;
