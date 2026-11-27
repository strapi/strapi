/**
 * Type-level regression tests for `factories.defineRoute`, compiled by `yarn test:ts`
 * (tsc -p tsconfig.json) and excluded from the build. Each block must compile; `@ts-expect-error`
 * marks the uses that must keep failing.
 */
import type { Core } from '@strapi/types';
import { z } from 'zod/v4';

import { defineRoute } from '../factories';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;

// The handler input is the zod output of each declared part.
export const refundRoute = defineRoute({
  method: 'POST',
  path: '/orders/:id/refunds',
  request: {
    params: { id: z.coerce.number().int() },
    query: { notify: z.stringbool().optional(), reason: z.enum(['damaged', 'late']) },
    body: { 'application/json': z.object({ amount: z.number().positive() }) },
  },
  async handler(ctx) {
    const { params, query, body } = ctx.input;

    true satisfies Assert<IsEqual<typeof params, { id: number }>>;
    true satisfies Assert<IsEqual<typeof query, { notify?: boolean; reason: 'damaged' | 'late' }>>;
    true satisfies Assert<IsEqual<typeof body, { amount: number }>>;

    // @ts-expect-error unknown body key
    body.currency satisfies unknown;
    // @ts-expect-error unknown params key
    params.slug satisfies unknown;
    // @ts-expect-error unknown query key
    query.page satisfies unknown;

    // The raw request members keep their types.
    true satisfies Assert<IsAny<typeof ctx.request.body>>;

    return { orderId: params.id, amount: body.amount };
  },
});

// A part the route does not declare is not a key of `ctx.input`.
export const listRoute = defineRoute({
  method: 'GET',
  path: '/orders',
  request: { query: { page: z.coerce.number().int().min(1).default(1) } },
  handler(ctx) {
    true satisfies Assert<IsEqual<typeof ctx.input, { query: { page: number } }>>;

    // @ts-expect-error no params declared
    ctx.input.params satisfies unknown;
    // @ts-expect-error no body declared
    ctx.input.body satisfies unknown;

    return ctx.input.query.page;
  },
});

// Without `request`, `ctx.input` is empty.
export const pingRoute = defineRoute({
  method: 'GET',
  path: '/ping',
  handler(ctx) {
    true satisfies Assert<IsEqual<typeof ctx.input, Record<never, never>>>;

    return 'pong';
  },
});

// A body declared for several media types is the union of their outputs.
export const uploadRoute = defineRoute({
  method: 'POST',
  path: '/imports',
  request: {
    body: {
      'application/json': z.object({ url: z.url() }),
      'multipart/form-data': z.object({ name: z.string() }),
    },
  },
  handler(ctx) {
    true satisfies Assert<IsEqual<typeof ctx.input.body, { url: string } | { name: string }>>;
  },
});

// The defined route fits the router types and keeps its `request` for reuse.
export const router: Core.RouterInput = {
  type: 'content-api',
  routes: [refundRoute, listRoute, pingRoute, uploadRoute],
};

true satisfies Assert<
  IsEqual<
    Core.ValidatedRouteInput<NonNullable<(typeof refundRoute)['request']>>['params'],
    { id: number }
  >
>;

defineRoute({
  method: 'GET',
  path: '/orders/:id',
  request: { params: { id: z.coerce.number() } },
  // @ts-expect-error a controller action referenced by name is not supported
  handler: 'api::order.order.findOne',
});
