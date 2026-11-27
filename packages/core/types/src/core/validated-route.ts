import type Koa from 'koa';
import type { z } from 'zod/v4';

import type { HTTPMediaRecord, RouteRequest } from './route';

type ValidatedShape<TShape> =
  TShape extends Record<string, z.ZodType> ? z.output<z.ZodObject<TShape>> : never;

type ValidatedBody<TBody> = TBody extends HTTPMediaRecord
  ? { [TMediaType in keyof TBody]: z.output<TBody[TMediaType]> }[keyof TBody]
  : never;

/**
 * The request values a route handler receives on `ctx.input` after `factories.defineRoute` parsed
 * them with the route's `request` schemas: the zod output of each declared part.
 *
 * A part the route does not declare is not a key: `ctx.input.query` is a type error on a route
 * without `request.query`. A body declared for several media types is the union of their outputs.
 */
export type ValidatedRouteInput<TRequest extends RouteRequest> = {
  [TPart in keyof TRequest & ('params' | 'query' | 'body')]-?: TPart extends 'body'
    ? ValidatedBody<TRequest[TPart]>
    : ValidatedShape<TRequest[TPart]>;
};

/**
 * The parsed request of a route, as `route.parseInput(ctx)` returns it for a route defined with
 * `factories.defineRoute`.
 *
 * @example
 * export const payRoute = factories.defineRoute({ method: 'POST', path: '/orders/:id/pay',
 *   handler: 'api::order.order.pay', request: { params: { id: z.coerce.number() } } });
 *
 * type PayInput = Core.ValidatedRouteInputOf<typeof payRoute>; // { params: { id: number } }
 */
export type ValidatedRouteInputOf<TRoute extends { request?: RouteRequest }> = ValidatedRouteInput<
  NonNullable<TRoute['request']>
>;

/**
 * The Koa context of a handler defined with `factories.defineRoute`: the usual context plus the
 * parsed request on `input`. `ctx.params`, `ctx.query` and `ctx.request.body` keep their raw values.
 */
export type ValidatedRouteContext<TRequest extends RouteRequest> = Koa.ParameterizedContext & {
  input: ValidatedRouteInput<TRequest>;
};

export type ValidatedRouteHandler<TRequest extends RouteRequest> = (
  ctx: ValidatedRouteContext<TRequest>,
  next: Koa.Next
) => unknown;
