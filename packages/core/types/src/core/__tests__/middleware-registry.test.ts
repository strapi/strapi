import type { ControllerHandler } from '../controller';
import type { Middleware, MiddlewareFactory, MiddlewareHandler } from '../middleware';
import type { Module } from '../module';
import type { Plugin } from '../plugin';
import type { RouteConfigFor, RouteInput } from '../route';
import type { RouterInputFor } from '../router';
import type { Strapi as StrapiInstance } from '../strapi';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageMiddlewares {
        'strapi::middlewareLab': undefined;
        'plugin::middleware-lab.cache': { ttl: number };
        'plugin::middleware-lab.compress': { level?: number };
        'plugin::middleware-lab.limit': { max: number } | undefined;
        'api::middleware-lab.audit': { channel: string };
        'admin::middlewareLab': unknown;
      }

      interface AppMiddlewares {
        'plugin::middleware-lab.cache': { maxAge: number };
      }
    }
  }
}

const controllers = { items: {} as { list: ControllerHandler } } as const;

type LabRouter = RouterInputFor<typeof controllers, 'plugin::middleware-lab'>;

declare const inline: MiddlewareHandler;

// Registered middlewares are accepted, by name when their config is optional. Runtime passes `{}` to
// the factory without a config, so a config whose fields are all optional is optional too.
({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/items',
      handler: 'items.list',
      config: {
        middlewares: [
          'strapi::middlewareLab',
          'plugin::middleware-lab.compress',
          'plugin::middleware-lab.limit',
          'admin::middlewareLab',
          { name: 'plugin::middleware-lab.compress' },
          { name: 'plugin::middleware-lab.compress', config: { level: 9 } },
          { name: 'plugin::middleware-lab.cache', config: { maxAge: 60 } },
          { name: 'api::middleware-lab.audit', config: { channel: 'logs' } },
          { name: 'admin::middlewareLab', config: 'anything' },
          inline,
          { resolve: './src/custom-middleware', config: { anything: true } },
          { resolve: 'koa-custom' },
        ],
      },
    },
  ],
}) satisfies LabRouter;

({
  // @ts-expect-error A middleware whose config is required cannot be referenced by name alone.
  middlewares: ['api::middleware-lab.audit'],
}) satisfies RouteConfigFor;
({
  // @ts-expect-error A required config cannot be omitted from `{ name }` either.
  middlewares: [{ name: 'api::middleware-lab.audit' }],
}) satisfies RouteConfigFor;
({
  // @ts-expect-error The config is checked against the registered contract.
  middlewares: [{ name: 'plugin::middleware-lab.compress', config: { level: 'max' } }],
}) satisfies RouteConfigFor;
({
  // @ts-expect-error The application override replaces the default config contract.
  middlewares: [{ name: 'plugin::middleware-lab.cache', config: { ttl: 60 } }],
}) satisfies RouteConfigFor;
({
  // @ts-expect-error Once any middleware is registered, unregistered middlewares are rejected.
  middlewares: ['global::unregistered'],
}) satisfies RouteConfigFor;
({
  // @ts-expect-error Unregistered middlewares are rejected in the `{ name, config }` form too.
  middlewares: [{ name: 'global::unregistered', config: {} }],
}) satisfies RouteConfigFor;
({
  // @ts-expect-error Runtime resolves middleware names exactly, without the route namespace.
  middlewares: ['compress'],
}) satisfies RouteConfigFor<'plugin::middleware-lab'>;

// Untyped route configs keep accepting any middleware name.
({
  method: 'GET',
  path: '/items',
  handler: 'items.list',
  config: { middlewares: ['global::unregistered', inline] },
}) satisfies RouteInput;

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const strapi: StrapiInstance;
declare const dynamicName: string;
declare const patternName: `plugin::middleware-lab.${string}`;
type LabFactory = MiddlewareFactory<{ custom: true }>;

// Middleware lookups resolve registered names to a factory that receives their config contract,
// like `strapi.middlewares`. `strapi.middleware` takes full names, plugin lookups relative names.
const cache = strapi.middleware('plugin::middleware-lab.cache');
const coreMiddleware = strapi.middleware('strapi::middlewareLab');
const pluginCache = strapi.plugin('middleware-lab').middleware('cache');
const pluginLimit = strapi.plugin('middleware-lab').middleware('limit');
// Unregistered literal names, relative names in `strapi.middleware`, and dynamic names resolve to `unknown`.
const unregistered = strapi.middleware('global::unregistered');
const relative = strapi.middleware('cache');
const dynamic = strapi.middleware(dynamicName);
const pattern = strapi.middleware(patternName);
const pluginUnregistered = strapi.plugin('middleware-lab').middleware('unregistered');
const pluginFullName = strapi.plugin('middleware-lab').middleware('plugin::middleware-lab.cache');
const pluginDynamic = strapi.plugin('middleware-lab').middleware(dynamicName);
const legacyPlugin: Plugin = strapi.plugin('middleware-lab');
const legacyPluginMiddleware = legacyPlugin.middleware('cache');
// An explicit type argument wins over the registries.
const explicit = strapi.middleware<LabFactory>('global::unregistered');
const explicitRegistered = strapi.middleware<LabFactory>('plugin::middleware-lab.cache');
const pluginExplicit = strapi.plugin('middleware-lab').middleware<LabFactory>('unregistered');
declare const lookupChecks: [
  Expect<Equal<typeof cache, MiddlewareFactory<{ maxAge: number }>>>,
  Expect<Equal<typeof coreMiddleware, MiddlewareFactory<undefined>>>,
  Expect<Equal<typeof pluginCache, MiddlewareFactory<{ maxAge: number }>>>,
  Expect<Equal<typeof pluginLimit, MiddlewareFactory<{ max: number } | undefined>>>,
  Expect<Equal<typeof unregistered, unknown>>,
  Expect<Equal<typeof relative, unknown>>,
  Expect<Equal<typeof dynamic, unknown>>,
  Expect<Equal<typeof pattern, unknown>>,
  Expect<Equal<typeof pluginUnregistered, unknown>>,
  Expect<Equal<typeof pluginFullName, unknown>>,
  Expect<Equal<typeof pluginDynamic, unknown>>,
  Expect<Equal<typeof legacyPluginMiddleware, unknown>>,
  Expect<Equal<typeof explicit, LabFactory>>,
  Expect<Equal<typeof explicitRegistered, LabFactory>>,
  Expect<Equal<typeof pluginExplicit, LabFactory>>,
];
lookupChecks satisfies unknown;

// @ts-expect-error `T` is not inferred from the annotation.
const contextual: LabFactory = strapi.middleware('global::unregistered');
contextual satisfies unknown;

// API module lookups resolve relative names, i.e. `api::<api>.<name>`, like plugin lookups.
const apiAudit = strapi.api('middleware-lab').middleware('audit');
const apiUnregistered = strapi.api('middleware-lab').middleware('unregistered');
const apiExplicit = strapi.api('middleware-lab').middleware<LabFactory>('unregistered');
// Modules other than APIs, such as `strapi.admin`, keep the legacy middleware.
const adminModuleMiddleware = strapi.admin.middleware('middlewareLab');
declare const apiLookupChecks: [
  Expect<Equal<typeof apiAudit, MiddlewareFactory<{ channel: string }>>>,
  Expect<Equal<typeof apiAudit, Module<'api::middleware-lab'>['middlewares']['audit']>>,
  Expect<Equal<typeof apiUnregistered, unknown>>,
  Expect<Equal<typeof apiExplicit, LabFactory>>,
  Expect<Equal<typeof adminModuleMiddleware, Middleware>>,
];
apiLookupChecks satisfies unknown;

// Maps resolve registered keys to their factory, other keys to the legacy middleware.
const mappedCache = strapi.middlewares['plugin::middleware-lab.cache'];
const mappedDynamic = strapi.middlewares[dynamicName];
const mappedPluginCache = strapi.plugin('middleware-lab').middlewares.cache;
const mappedPluginOther = strapi.plugin('middleware-lab').middlewares.other;
declare const mapChecks: [
  Expect<Equal<typeof mappedCache, MiddlewareFactory<{ maxAge: number }>>>,
  Expect<Equal<typeof mappedDynamic, MiddlewareFactory>>,
  Expect<Equal<typeof mappedPluginCache, MiddlewareFactory<{ maxAge: number }>>>,
  Expect<Equal<typeof mappedPluginOther, Middleware>>,
];
mapChecks satisfies unknown;
// @ts-expect-error Registered factories receive their config contract.
cache({ ttl: 1 }, { strapi });
