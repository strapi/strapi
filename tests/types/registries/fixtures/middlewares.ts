import type { Core } from '@strapi/strapi';

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
({
  // @ts-expect-error A Koa handler registered as a middleware cannot be referenced by name.
  middlewares: ['plugin::content-type-builder.isDevelopmentMode'],
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
  Expect<Equal<typeof emailRateLimit, Core.MiddlewareFactory<unknown>>>,
  Expect<Equal<typeof mapped, Core.MiddlewareFactory<undefined>>>,
  Expect<Equal<typeof unregistered, unknown>>,
  Expect<Equal<typeof dynamic, unknown>>,
];
checks satisfies unknown;
