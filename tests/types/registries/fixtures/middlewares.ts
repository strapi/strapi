import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';
import type { RateLimitOptions } from '@strapi/email/strapi-server';

// Bundled packages register every middleware they ship: `strapi::*` from `@strapi/core`, `admin::*`
// from `@strapi/admin`, and plugin middlewares such as `plugin::email.rateLimit`.
type Controllers = { items: { list: Core.ControllerHandler } };
declare const inline: Core.MiddlewareHandler;

({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/items',
      handler: 'items.list',
      config: {
        middlewares: [
          'strapi::responseTime',
          // Options merge over the factory defaults, so a config with required fields is optional.
          'strapi::cors',
          'strapi::poweredBy',
          'admin::rateLimit',
          'plugin::email.rateLimit',
          // A factory without config: the name alone is enough.
          'plugin::content-type-builder.isDevelopmentMode',
          { name: 'strapi::cors', config: { origin: ['https://example.com'], maxAge: 60 } },
          { name: 'strapi::poweredBy', config: { poweredBy: 'Example' } },
          { name: 'admin::rateLimit', config: { max: 10 } },
          inline,
          { resolve: './src/middlewares/custom', config: { enabled: true } },
        ],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers>;

({
  // @ts-expect-error Unregistered middlewares are rejected once bundled middlewares are registered.
  middlewares: ['global::unregistered'],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error The config is checked against the registered contract.
  middlewares: [{ name: 'strapi::poweredBy', config: { poweredBy: 1 } }],
}) satisfies Core.RouteConfigFor;

// `strapi::compression`, `strapi::public` and `strapi::favicon` declare their own config types, so
// they are checked without the third-party `@types` packages.
({
  middlewares: [
    { name: 'strapi::compression', config: { threshold: '1kb', br: false } },
    { name: 'strapi::public', config: { maxAge: 60000 } },
    { name: 'strapi::favicon', config: { path: 'favicon.ico', maxAge: 86400000 } },
  ],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error The compression config is checked.
  middlewares: [{ name: 'strapi::compression', config: { threshold: true } }],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error The public config is checked.
  middlewares: [{ name: 'strapi::public', config: { maxAge: '1m' } }],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error The favicon config is checked.
  middlewares: [{ name: 'strapi::favicon', config: { path: 1 } }],
}) satisfies Core.RouteConfigFor;
// `strapi::security` takes the options `koa-helmet` passes to `helmet`, typed from `helmet` itself.
({
  middlewares: [
    'strapi::security',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: { 'img-src': ["'self'", 'data:'] },
        },
        hsts: { maxAge: 31536000, includeSubDomains: true },
      },
    },
  ],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error The security config is checked.
  middlewares: [{ name: 'strapi::security', config: { hsts: { maxAge: '1y' } } }],
}) satisfies Core.RouteConfigFor;
({
  middlewares: [
    { name: 'admin::rateLimit', config: { interval: { min: 1 }, max: 3 } },
    { name: 'plugin::email.rateLimit', config: { interval: 60000, prefixKey: 'email' } },
  ],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Rate limit options are checked.
  middlewares: [{ name: 'admin::rateLimit', config: { max: '3' } }],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Config keys are checked against the registered contract.
  middlewares: [{ name: 'admin::rateLimit', config: { maxx: 3 } }],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Runtime resolves `name` and ignores `resolve`, so an entry takes one of them.
  middlewares: [{ name: 'admin::rateLimit', resolve: './src/middlewares/custom' }],
}) satisfies Core.RouteConfigFor;

// `Core.RouteConfig` keeps develop's type: names are not checked.
({ middlewares: ['global::unregistered', inline] }) satisfies Core.RouteConfig;

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const strapi: Core.Strapi;
declare const dynamicName: string;

// Registered names resolve to a factory that receives their config contract.
const cors = strapi.middleware('strapi::cors');
cors({ origin: '*' }, { strapi });
// @ts-expect-error The registered config contract is checked.
cors({ origin: 1 }, { strapi });
const responseTime = strapi.middleware('strapi::responseTime');
const emailRateLimit = strapi.plugin('email').middleware('rateLimit');
const mapped = strapi.middlewares['admin::data-transfer'];
const unregistered = strapi.middleware('global::unregistered');
const dynamic = strapi.middleware(dynamicName);
declare const checks: [
  Expect<Equal<typeof responseTime, Core.MiddlewareFactory<undefined>>>,
  Expect<Equal<typeof emailRateLimit, Core.MiddlewareFactory<RateLimitOptions | undefined>>>,
  Expect<Equal<typeof mapped, Core.MiddlewareFactory<undefined>>>,
  Expect<Equal<typeof unregistered, unknown>>,
  Expect<Equal<typeof dynamic, unknown>>,
];
checks satisfies unknown;

// `config/middlewares.ts` (`Core.Config.Middlewares`) checks every registered middleware against
// its registered config, as route references do. The create-strapi-app template list compiles: each
// of its middlewares defaults its config, so its name alone is enough.
[
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
] satisfies Core.Config.Middlewares;

// Every `strapi::*` middleware defaults its config, as the runtime passes `{}` to a bare name.
[
  'strapi::body',
  'strapi::compression',
  'strapi::cors',
  'strapi::errors',
  'strapi::favicon',
  'strapi::ip',
  'strapi::logger',
  'strapi::poweredBy',
  'strapi::public',
  'strapi::query',
  'strapi::responseTime',
  'strapi::responses',
  'strapi::security',
  'strapi::session',
] satisfies Core.Config.Middlewares;

const appMiddlewares: Core.Config.Middlewares = [
  'strapi::logger',
  { name: 'strapi::cors', config: { origin: ['https://example.com'], credentials: true } },
  {
    name: 'strapi::cors',
    config: {
      // A function origin receives the Koa context.
      origin(ctx) {
        true satisfies Equal<[typeof ctx], [Context]>;
        return ctx.request.header.origin ?? '*';
      },
    },
  },
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: { 'connect-src': ["'self'", 'https:'], 'img-src': ["'self'", 'data:'] },
      },
    },
  },
  { name: 'strapi::body', config: { jsonLimit: '1mb', formLimit: '1mb', textLimit: '1mb' } },
  { name: 'strapi::body', config: { formidable: { maxFileSize: 200 * 1024 * 1024 } } },
  { name: 'strapi::session', config: { secure: true, sameSite: 'lax' } },
  { name: 'strapi::poweredBy', config: { poweredBy: 'Example' } },
  { name: 'plugin::email.rateLimit', config: { max: 10 } },
  // Third-party plugins that register no contract stay open, by name or with any config.
  'plugin::third-party.unregistered',
  { name: 'plugin::third-party.unregistered', config: { anything: true } },
  // `resolve` entries load a package or a path, which registers nothing: their config is open.
  { resolve: './src/middlewares/custom', config: { enabled: true } },
  { resolve: 'koa-third-party' },
];
appMiddlewares satisfies unknown;

[
  // @ts-expect-error The runtime matches cors origins as strings: a RegExp never matches.
  { name: 'strapi::cors', config: { origin: [/^https:\/\/.*\.example\.com$/] } },
] satisfies Core.Config.Middlewares;
[
  // @ts-expect-error A registered config rejects unknown keys.
  { name: 'strapi::poweredBy', config: { poweredBy: 'Example', extra: true } },
] satisfies Core.Config.Middlewares;
[
  // @ts-expect-error A registered config rejects wrong value types.
  { name: 'strapi::poweredBy', config: { poweredBy: 1 } },
] satisfies Core.Config.Middlewares;
[
  // @ts-expect-error A registered config rejects wrong value types.
  { name: 'strapi::body', config: { jsonLimit: true } },
] satisfies Core.Config.Middlewares;
[
  // @ts-expect-error A middleware without config takes none.
  { name: 'strapi::logger', config: { level: 'debug' } },
] satisfies Core.Config.Middlewares;
[
  // @ts-expect-error An unregistered name outside `plugin::*` cannot be resolved by the runtime.
  'global::unregistered',
] satisfies Core.Config.Middlewares;
[
  // @ts-expect-error An unregistered name outside `plugin::*` cannot be resolved by the runtime.
  { name: 'strapi::unregistered', config: {} },
] satisfies Core.Config.Middlewares;
[
  // @ts-expect-error The runtime resolves `name` and ignores `resolve`, so an entry takes one of them.
  { name: 'strapi::cors', resolve: './src/middlewares/custom' },
] satisfies Core.Config.Middlewares;
[
  // @ts-expect-error A handler function is not a global middleware entry: Strapi fails to start.
  inline,
] satisfies Core.Config.Middlewares;

// Known gap: a registered `plugin::*` name with a config outside its contract also matches the open
// `plugin::*` entry, which third-party plugins that register nothing need, so it compiles. Types
// cannot exclude the registered names from the `plugin::${string}` pattern.
// This compiles, so it is not an `@ts-expect-error` case.
const pluginMismatch: Core.Config.Middlewares = [
  { name: 'plugin::email.rateLimit', config: { max: '10' } },
];
pluginMismatch satisfies unknown;
