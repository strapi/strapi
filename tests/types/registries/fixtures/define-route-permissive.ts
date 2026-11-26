// A user-land `defineRoute` with a plain `Core.RouteConfig` fits `Core.RouterInput` without strict
// types too (CMS-2543). Its own program. The strict variants are in `define-route.ts`.
import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';
import type { z as Z } from 'zod/v4';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

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

declare function definePlainRoute<const R extends Core.RouteRequest>(route: {
  method: Core.HTTPMethod;
  path: string;
  request: R;
  config?: Core.RouteConfig;
  handler: (ctx: Context & { input: Parsed<R> }) => unknown;
}): Omit<Core.RouteInput, 'handler' | 'config'> & {
  handler: Core.MiddlewareHandler;
  config?: Core.RouteConfig;
};

const plainPayRoute = definePlainRoute({
  method: 'POST',
  path: '/pay/:id',
  request: {
    params: { id: z.coerce.number().int() },
    body: { 'application/json': z.object({ amount: z.number() }) },
  },
  config: { policies: ['global::is-owner'] },
  async handler(ctx) {
    true satisfies Equal<typeof ctx.input.params.id, number>;
    true satisfies Equal<typeof ctx.input.body.amount, number>;
    // @ts-expect-error The parsed body has only the keys its schema declares.
    ctx.input.body.nope satisfies unknown;
    ctx.body = { id: ctx.input.params.id, amount: ctx.input.body.amount };
  },
});

({ type: 'content-api', routes: [plainPayRoute] }) satisfies Core.RouterInput;
