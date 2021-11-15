type SingleTypeControllerConfig = {
  find(): void;
  update(): void;
  delete(): void;
};

type CollectionTypeControllerConfig = {
  find(): void;
  findOne(): void;
  create(): void;
  update(): void;
  delete(): void;
};

type ControllerConfig = SingleTypeControllerConfig | CollectionTypeControllerConfig;

interface SingleTypeController {}

interface CollectionTypeController {}

type Controller = SingleTypeController | CollectionTypeController;

type SingleTypeServiceConfig = {
  find(): void;
  update(): void;
  delete(): void;
};

type CollectionTypeServiceConfig = {
  find(): void;
  findOne(): void;
  create(): void;
  update(): void;
  delete(): void;
};

type ServiceConfig = SingleTypeServiceConfig | CollectionTypeServiceConfig;

interface SingleTypeService {}
interface CollectionTypeService {}

type Service = SingleTypeService | CollectionTypeService;

export function createCoreController(uid: string, cfg: ControllerConfig): Controller;
export function createService(uid: string, cfg: ServiceConfig): Service;

type HandlerConfig = {
  auth: false | { scope: string[] };
  policies: string[];
  middlewares: string[];
};

type SingleTypeRouterConfig = {
  find: HandlerConfig;
  update: HandlerConfig;
  delete: HandlerConfig;
};

type CollectionTypeRouterConfig = {
  find: HandlerConfig;
  findOne: HandlerConfig;
  create: HandlerConfig;
  update: HandlerConfig;
  delete: HandlerConfig;
};

type RouterConfig = {
  prefix: string;
  only: string[];
  except: string[];
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

export function createCoreRouter(uid: string, cfg: RouterConfig): Router;
