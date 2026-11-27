// A user-land `defineRoute` that parses `request` into a typed `ctx.input` fits the router types
// unchanged. Typed request input comes later, through opt-in helpers like this one, not by
// tightening the `ctx` of the existing handler types (CMS-2543).
import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';
import type { z as Z } from 'zod/v4';

// Operands wrapped in a tuple: TypeScript's error type (an unresolved type, printed as `any`)
// would otherwise make the comparison true for any other operand.
type Equal<T, U> =
  (<V>() => V extends [T] ? 1 : 2) extends <V>() => V extends [U] ? 1 : 2 ? true : false;

declare const z: typeof Z;

type Shape<T> =
  T extends Record<string, Z.ZodType> ? { [K in keyof T]: Z.output<T[K]> } : Record<string, never>;
type Parsed<R extends Core.RouteRequest> = {
  params: Shape<R['params']>;
  query: Shape<R['query']>;
  body: R['body'] extends { 'application/json': infer B extends Z.ZodType }
    ? Z.output<B>
    : undefined;
};
type Definition<R extends Core.RouteRequest, TConfig> = {
  method: Core.HTTPMethod;
  path: string;
  request: R;
  config?: TConfig;
  handler: (ctx: Context & { input: Parsed<R> }) => unknown;
};
type Defined<TConfig> = Omit<Core.RouteInput, 'handler' | 'config'> & {
  handler: Core.MiddlewareHandler;
  config?: TConfig;
};

// One helper per config type: `Core.RouteConfig` and `Core.RouteConfigFor` do not mix, so a route
// fits either `Core.RouterInput` or `Core.RouterInputFor`, not both.
declare function defineRoute<const R extends Core.RouteRequest>(
  route: Definition<R, Core.RouteConfigFor>
): Defined<Core.RouteConfigFor>;
declare function definePlainRoute<const R extends Core.RouteRequest>(
  route: Definition<R, Core.RouteConfig>
): Defined<Core.RouteConfig>;

const request = {
  params: { id: z.coerce.number().int() },
  body: { 'application/json': z.object({ amount: z.number() }) },
};

const payRoute = defineRoute({
  method: 'POST',
  path: '/pay/:id',
  request,
  async handler(ctx) {
    // The input is the zod output: `z.coerce.number()` parses the string param into a number.
    true satisfies Equal<typeof ctx.input.params.id, number>;
    true satisfies Equal<typeof ctx.input.body.amount, number>;
    // @ts-expect-error The parsed params have only the keys the route declares.
    ctx.input.params.slug satisfies unknown;
    // @ts-expect-error The parsed body has only the keys its schema declares.
    ctx.input.body.nope satisfies unknown;
    ctx.body = { id: ctx.input.params.id, amount: ctx.input.body.amount };
  },
});

type Controllers = { stats: { summary: Core.ControllerHandler } };

({
  type: 'content-api',
  routes: [payRoute, { method: 'GET', path: '/stats', handler: 'stats.summary' }],
}) satisfies Core.RouterInputFor<Controllers>;

const plainPayRoute = definePlainRoute({
  method: 'POST',
  path: '/pay/:id',
  request,
  config: { policies: ['global::is-owner'] },
  async handler(ctx) {
    true satisfies Equal<typeof ctx.input.params.id, number>;
    ctx.body = { id: ctx.input.params.id };
  },
});

({ type: 'content-api', routes: [plainPayRoute] }) satisfies Core.RouterInput;
