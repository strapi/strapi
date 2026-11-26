import { createContentApiRoutesFactory, isBuiltRouter, routesOf } from '@strapi/utils';
import type {
  ContentApiRoutesFactory,
  ModuleRouterLike,
  RouterFactoryLike,
  RouterObjectLike,
} from '@strapi/utils';
import type { RouteInfo, RouteInput } from '../route';
import type {
  ModuleRouter,
  ModuleRouterFactory,
  ModuleRouterObject,
  ModuleRoutes,
  PluginRoutes,
  Router,
  RouterConfig,
} from '../router';
import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

declare const strapi: StrapiInstance;
declare const dynamicName: string;

// The routes of a loaded API or plugin are what the module declared until Strapi registers them
// (`server.initRouting()`, in the bootstrap phase), then the routers built from them.
const api = strapi.api('article');
const dynamicApi = strapi.api(dynamicName);
const plugin = strapi.plugin('i18n');
const dynamicPlugin = strapi.plugin(dynamicName);
declare const loadedRoutes: [
  Expect<Equal<(typeof api)['routes'], ModuleRoutes>>,
  Expect<Equal<(typeof dynamicApi)['routes'], ModuleRoutes>>,
  Expect<Equal<(typeof plugin)['routes'], PluginRoutes>>,
  Expect<Equal<(typeof dynamicPlugin)['routes'], PluginRoutes>>,
  Expect<Equal<(typeof strapi.apis)[string]['routes'], ModuleRoutes>>,
  Expect<Equal<(typeof strapi.plugins)[string]['routes'], PluginRoutes>>,
];
loadedRoutes satisfies unknown;

// `info` is set when Strapi registers the routes: a loaded route may not have it yet.
declare const routeInfo: [Expect<Equal<RouteInput['info'], Partial<RouteInfo> | undefined>>];
routeInfo satisfies unknown;

const route = { method: 'GET', path: '/articles', handler: 'article.find' } satisfies RouteInput;

// A declared router object: `type` and `prefix` are optional, Strapi defaults them.
const declaredObject = { routes: [route] };
declaredObject satisfies ModuleRouterObject;
declaredObject satisfies ModuleRouter;

// A declared factory, without `.routes`.
const factory = ({ strapi: instance }: { strapi: StrapiInstance }) => {
  instance satisfies StrapiInstance;
  return { type: 'admin' as const, routes: [route] };
};
factory satisfies ModuleRouterFactory;
factory satisfies ModuleRouter;

// A content API factory of `createContentApiRoutesFactory`, which exposes its routes as `.routes`.
const contentApiFactory = createContentApiRoutesFactory((): RouteInput[] => [route]);
contentApiFactory satisfies ModuleRouterFactory;
contentApiFactory satisfies ModuleRouter;
declare const contentApiRouter: ContentApiRoutesFactory<RouteInput[]>;
contentApiRouter satisfies ModuleRouterFactory;

// A router built when the routes are registered, and develop's declaration types.
declare const built: Router;
built satisfies ModuleRouterObject;
declare const declarationChecks: [
  Expect<Equal<RouterConfig extends ModuleRouter ? true : false, true>>,
  Expect<Equal<Router extends ModuleRouter ? true : false, true>>,
];
declarationChecks satisfies unknown;

// An API router file may export an array of routes: that entry stays an array.
const apiRoutes = {
  article: declaredObject,
  factory,
  'content-api': contentApiFactory,
  custom: [route],
  built,
} satisfies ModuleRoutes;

// A plugin may declare its routes as one array, which stays an array.
const pluginArray = [route] satisfies PluginRoutes;
const pluginMap = { admin: factory, 'content-api': contentApiFactory } satisfies PluginRoutes;
// @ts-expect-error An entry of a plugin's router map is a router: Strapi fails to register an array.
({ admin: [route] }) satisfies PluginRoutes;

// The module routers relate to the readers of `@strapi/utils`.
declare const utilsChecks: [
  Expect<Equal<ModuleRouterObject extends RouterObjectLike<RouteInput> ? true : false, true>>,
  Expect<Equal<ModuleRouterFactory extends RouterFactoryLike<RouteInput> ? true : false, true>>,
  Expect<Equal<ModuleRoutes[string] extends ModuleRouterLike<RouteInput> ? true : false, true>>,
];
utilsChecks satisfies unknown;

// `routesOf` reads the routes of every form as `RouteInput[]`.
declare const objectRouter: ModuleRouterObject;
declare const factoryRouter: ModuleRouterFactory;
declare const arrayEntry: RouteInput[];
const ofObject = routesOf(objectRouter);
const ofFactory = routesOf(factoryRouter);
const ofContentApiFactory = routesOf(contentApiRouter);
const ofBuilt = routesOf<RouteInput>(built);
const ofArrayEntry = routesOf(arrayEntry);
const ofEntry = routesOf(api.routes.article);
const ofApi = Object.values(api.routes).flatMap(routesOf);
const ofPlugin = Array.isArray(plugin.routes)
  ? plugin.routes
  : Object.values(plugin.routes).flatMap(routesOf);
declare const routesOfChecks: [
  Expect<Equal<typeof ofObject, RouteInput[]>>,
  Expect<Equal<typeof ofFactory, RouteInput[]>>,
  Expect<Equal<typeof ofContentApiFactory, RouteInput[]>>,
  Expect<Equal<typeof ofBuilt, RouteInput[]>>,
  Expect<Equal<typeof ofArrayEntry, RouteInput[]>>,
  Expect<Equal<typeof ofEntry, RouteInput[]>>,
  Expect<Equal<typeof ofApi, RouteInput[]>>,
  Expect<Equal<typeof ofPlugin, RouteInput[]>>,
];
routesOfChecks satisfies unknown;
[apiRoutes, pluginArray, pluginMap] satisfies unknown[];

// @ts-expect-error A route has `info` once Strapi registered it.
ofApi[0].info.type satisfies unknown;
ofApi[0].info?.type satisfies string | undefined;

// Reading a router: an array entry first, then a factory Strapi has not called yet.
const entry = api.routes.article;
if (Array.isArray(entry) === true) {
  entry satisfies RouteInput[];
} else if (isBuiltRouter(entry) === true) {
  const builtChecks: [
    Expect<Equal<typeof entry, ModuleRouterObject>>,
    Expect<Equal<typeof entry.prefix, string | undefined>>,
    Expect<Equal<typeof entry.routes, RouteInput[]>>,
  ] = [true, true, true];
  builtChecks satisfies unknown;
} else {
  const factoryChecks: [
    Expect<Equal<typeof entry, ModuleRouterFactory>>,
    Expect<Equal<typeof entry.routes, RouteInput[] | undefined>>,
  ] = [true, true];
  factoryChecks satisfies unknown;
}

// @ts-expect-error A router may be a factory, or an array of routes, until it is narrowed.
api.routes.article.prefix satisfies unknown;
// @ts-expect-error A plugin's routes may be an array.
plugin.routes['content-api'] satisfies unknown;

// Strapi replaces the declared routers with the built ones when it registers the routes.
api.routes = { article: built };
plugin.routes = { admin: built };
plugin.routes = [route];
