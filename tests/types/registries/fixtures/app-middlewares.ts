// Strict mode with a generated `middlewares.d.ts`, written by the consumer test from `app/src`.
import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
/** `true` only for `unknown`: `any` and every other type give `false`. */
declare function exactlyUnknown<T>(
  value: T
): [unknown] extends [T] ? (0 extends 1 & T ? false : true) : false;
type Config<TUID extends keyof Strapi.Registries.AppMiddlewares> =
  Strapi.Registries.AppMiddlewares[TUID];

// The registered value is the config contract: the factory's first parameter.
true satisfies Equals<Config<'global::rateLimit'>, { max: number }>;
true satisfies Equals<Config<'api::article.audit-log'>, { level?: 'info' | 'warn' } | undefined>;
// No parameter takes no config; an untyped JS middleware accepts any config.
true satisfies Equals<Config<'global::timer'>, undefined>;
declare const legacy: Config<'global::legacy'>;
exactlyUnknown(legacy) satisfies true;
// A plain Koa handler is not a factory: no config can be passed to it.
true satisfies Equals<Config<'global::koaHandler'>, never>;

// Lookups receive the config contract.
const rateLimit = app.middleware('global::rateLimit');
rateLimit satisfies Core.MiddlewareFactory<{ max: number }>;
rateLimit({ max: 10 }, { strapi: app });
// @ts-expect-error The registered config contract is checked.
rateLimit({ max: '10' }, { strapi: app });
app.middlewares['global::timer'] satisfies Core.MiddlewareFactory<undefined>;

type Controllers = { article: { find: Core.ControllerHandler } };

({
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/articles',
      handler: 'article.find',
      config: {
        middlewares: [
          { name: 'global::rateLimit', config: { max: 10 } },
          'global::timer',
          'api::article.audit-log',
          { name: 'api::article.audit-log', config: { level: 'warn' } },
          'global::legacy',
          { name: 'global::legacy', config: { anything: true } },
          // Bundled package middlewares stay accepted next to application middlewares.
          'strapi::cors',
        ],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers, 'api::article'>;

({
  // @ts-expect-error A required config cannot be left out.
  middlewares: ['global::rateLimit'],
}) satisfies Core.RouteConfigFor<'api::article'>;
({
  // @ts-expect-error The config is checked against the factory's first parameter.
  middlewares: [{ name: 'global::rateLimit', config: { max: '10' } }],
}) satisfies Core.RouteConfigFor<'api::article'>;
({
  // @ts-expect-error An optional config is still checked.
  middlewares: [{ name: 'api::article.audit-log', config: { level: 'debug' } }],
}) satisfies Core.RouteConfigFor<'api::article'>;
({
  // @ts-expect-error Unknown middlewares are rejected.
  middlewares: ['global::isMissing'],
}) satisfies Core.RouteConfigFor<'api::article'>;
({
  // @ts-expect-error A Koa handler is not a factory, runtime cannot call it by name.
  middlewares: ['global::koaHandler'],
}) satisfies Core.RouteConfigFor<'api::article'>;
declare const koaContext: Parameters<Core.MiddlewareHandler>[0];
({
  // @ts-expect-error Its first parameter is not a config: nothing can be passed to it.
  middlewares: [{ name: 'global::koaHandler', config: koaContext }],
}) satisfies Core.RouteConfigFor<'api::article'>;
