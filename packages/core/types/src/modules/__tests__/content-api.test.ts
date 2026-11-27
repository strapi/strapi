/**
 * Type-level regression tests, compiled by `yarn test:ts` (tsc -p tsconfig.json).
 * `strapi.contentAPI.addQueryParams` accepts the schemas that parse a query string at runtime:
 * query values are strings (arrays of strings for a repeated key). `@ts-expect-error` marks the
 * schemas that must keep failing: those the runtime check rejects, and those that accept no string
 * and so fail on every value (`z.number()`, `z.boolean()`).
 */
import { z } from 'zod/v4';

import type { Modules } from '../..';

declare const contentAPI: Modules.ContentAPI.ContentApi;

// Strings, string formats and enums
contentAPI.addQueryParams({ search: { schema: z.string().max(200).optional() } });
contentAPI.addQueryParams({ email: { schema: z.email() } });
contentAPI.addQueryParams({ sort: { schema: z.enum(['asc', 'desc']).default('asc') } });

// Coerced numbers, inline, wrapped, from a factory, or built beforehand
const page = z.coerce.number().int().min(1);
contentAPI.addQueryParams({ page: { schema: page } });
contentAPI.addQueryParams({ limit: { schema: z.coerce.number().optional() } });
contentAPI.addQueryParams({ offset: { schema: z.coerce.number().default(0) } });
contentAPI.addQueryParams({
  minRating: {
    schema: (zod) => zod.coerce.number().int().min(1).optional(),
    matchRoute: (route) => route.method === 'GET',
  },
});

// A boolean flag as the strings 'true' and 'false'
contentAPI.addQueryParams({ preview: { schema: (zod) => zod.enum(['true', 'false']).optional() } });

// Arrays of scalars, for a repeated key
contentAPI.addQueryParams({ tags: { schema: z.array(z.string()).optional() } });
contentAPI.addQueryParams({ ids: { schema: (zod) => zod.array(zod.coerce.number()).default([]) } });

// Any nesting of optional, default and array, as the runtime check unwraps them recursively
contentAPI.addQueryParams({ limit: { schema: z.coerce.number().optional().default(10) } });
contentAPI.addQueryParams({ limit: { schema: z.coerce.number().default(10).optional() } });
contentAPI.addQueryParams({ tags: { schema: z.array(z.string().optional()) } });
contentAPI.addQueryParams({
  ids: { schema: (zod) => zod.array(zod.coerce.number().default(0)).optional() },
});
contentAPI.addQueryParams({ matrix: { schema: z.array(z.array(z.enum(['a', 'b']))).optional() } });

// The type follows up to 5 wrappers (the runtime check has no limit)
contentAPI.addQueryParams({
  deep: { schema: z.array(z.array(z.coerce.number().optional()).default([])).optional() },
});
contentAPI.addQueryParams({
  deeper: {
    // @ts-expect-error a 6th wrapper is past the type's limit
    schema: z.array(z.array(z.coerce.number().optional()).default([])).optional().default([]),
  },
});

// Several params at once, and options typed as the wide AddQueryParamsOptions
contentAPI.addQueryParams({ q: { schema: z.string() }, size: { schema: z.coerce.number() } });
declare const options: Modules.ContentAPI.AddQueryParamsOptions;
contentAPI.addQueryParams(options);

// Schemas that accept no string fail on every query value
// @ts-expect-error z.number() accepts no string: use z.coerce.number()
contentAPI.addQueryParams({ count: { schema: z.number() } });
// @ts-expect-error z.int() accepts no string
contentAPI.addQueryParams({ count: { schema: z.int().optional() } });
// @ts-expect-error z.boolean() accepts no string: use z.enum(['true', 'false'])
contentAPI.addQueryParams({ draft: { schema: z.boolean() } });
// @ts-expect-error the factory returns z.number()
contentAPI.addQueryParams({ count: { schema: (zod) => zod.number().optional() } });
// @ts-expect-error an array of z.number() accepts no array of strings
contentAPI.addQueryParams({ ids: { schema: z.array(z.number()) } });
// @ts-expect-error z.number() accepts no string, however deep its wrappers
contentAPI.addQueryParams({ count: { schema: z.number().optional().default(1) } });
// @ts-expect-error z.boolean() accepts no string, however deep its wrappers
contentAPI.addQueryParams({ draft: { schema: (zod) => zod.boolean().default(false).optional() } });
// @ts-expect-error an array of optional z.number() accepts no array of strings
contentAPI.addQueryParams({ ids: { schema: z.array(z.number().optional()) } });
// @ts-expect-error a nested array of z.number() accepts no nested array of strings
contentAPI.addQueryParams({ ids: { schema: z.array(z.array(z.number())).optional() } });
contentAPI.addQueryParams({
  q: { schema: z.string() },
  // @ts-expect-error one invalid param among valid ones
  count: { schema: z.number() },
});

// Schemas the runtime check rejects at registration
// @ts-expect-error nested objects belong to addInputParams
contentAPI.addQueryParams({ filter: { schema: z.object({ name: z.string() }) } });
contentAPI.addQueryParams({
  // @ts-expect-error nested objects are rejected under wrappers too
  filter: { schema: z.array(z.object({ name: z.string() })).optional() },
});
// @ts-expect-error nullable is not unwrapped by the runtime check
contentAPI.addQueryParams({ search: { schema: z.string().nullable() } });
// @ts-expect-error nullable is not unwrapped by the runtime check, even under optional
contentAPI.addQueryParams({ search: { schema: z.string().nullish().default('') } });
contentAPI.addQueryParams({
  // @ts-expect-error transforms (ZodPipe) are rejected at runtime
  flag: { schema: z.enum(['true', 'false']).transform((v) => v === 'true') },
});
