import type { Context } from 'koa';

import type { Base } from '../core-api/controller';
import type { Equal, Expect } from '../../../tests/helpers/assert';

declare const controller: Base;
declare const ctx: Context;

// With strict types, the sanitized data keeps the type of `data`: a request body stays `any`, so it
// can be passed on to a strict service as the raw body can.
declare const checks: [
  Expect<
    Equal<
      Awaited<ReturnType<typeof controller.sanitizeInput<{ title: string }>>>,
      { title: string }
    >
  >,
];
checks satisfies unknown;

export async function sanitizedRequestBody() {
  const sanitized = await controller.sanitizeInput(ctx.request.body.data, ctx);
  const title: string = sanitized.title;
  return title;
}
