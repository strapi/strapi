import type { Core } from '@strapi/types';
import { errors, validateZodSchema, z } from '@strapi/utils';

type RequestContext = {
  params?: Record<string, string>;
  query?: unknown;
  request: { body?: unknown; is(types: string[]): string | false | null };
};

type InputPart = 'params' | 'query';

/**
 * Throws at route definition when a `params` or `query` schema can never accept the strings a
 * request carries: `z.number()` and `z.boolean()` fail on every value, and `z.coerce.boolean()`
 * turns `'false'` into `true`.
 *
 * Only the top-level schema is checked, through `optional`, `nullable` and `default` wrappers.
 * TODO @Nico nested query objects (e.g. `pagination: z.object({ page: z.number() })`) are not checked.
 */
const assertStringCompatible = (part: InputPart, key: string, schema: z.ZodType) => {
  let def = schema._zod.def;

  while (def.type === 'optional' || def.type === 'nullable' || def.type === 'default') {
    def = (def as z.core.$ZodOptionalDef).innerType._zod.def;
  }

  const coerce = 'coerce' in def && def.coerce === true;
  const location = `request.${part}.${key}`;

  if (def.type === 'boolean') {
    const fix = coerce
      ? `z.coerce.boolean() turns 'false' into true`
      : `${part} values are strings, so z.boolean() fails on every value`;
    throw new TypeError(`${location}: ${fix}. Use z.stringbool() instead.`);
  }

  if ((def.type === 'number' || def.type === 'bigint') && coerce === false) {
    throw new TypeError(
      `${location}: ${part} values are strings, so z.${def.type}() fails on every value. Use z.coerce.${def.type}() instead.`
    );
  }
};

/**
 * Builds the function that parses a request with a route's `request` schemas, for routes defined
 * with `factories.defineRoute`. The schemas are combined once, when the route is defined.
 *
 * - `params` and `query` are parsed as objects: unknown keys are stripped, and no value is coerced
 *   unless its schema coerces it (`z.coerce.number()`, `z.stringbool()`).
 * - The body schema is chosen by the request content type among the declared media types.
 * - On failure, throws a `ValidationError` (400) whose `details.errors[].path` starts with the part.
 *
 * The raw `ctx.params`, `ctx.query` and `ctx.request.body` are left unchanged.
 */
export const createValidatedInputParser = (request: Core.RouteRequest) => {
  const shape: Record<string, z.ZodType> = {};

  for (const part of ['params', 'query'] as const) {
    const schemas = request[part];

    if (schemas !== undefined) {
      for (const [key, schema] of Object.entries(schemas)) {
        assertStringCompatible(part, key, schema);
      }

      shape[part] = z.object(schemas);
    }
  }

  const bodySchemas = request.body ?? {};
  const mediaTypes = Object.keys(bodySchemas);

  const schemaWithoutBody = z.object(shape);
  const schemasByMediaType = new Map(
    mediaTypes.map((mediaType) => [mediaType, z.object({ ...shape, body: bodySchemas[mediaType] })])
  );

  return (ctx: RequestContext): Record<string, unknown> => {
    const value = { params: { ...ctx.params }, query: ctx.query, body: ctx.request.body };

    if (mediaTypes.length === 0) {
      return validateZodSchema(schemaWithoutBody)(value);
    }

    const mediaType = ctx.request.is(mediaTypes);
    const schema = typeof mediaType === 'string' ? schemasByMediaType.get(mediaType) : undefined;

    if (schema === undefined) {
      // TODO @Nico a 415 would be more precise, but Strapi has no error class for it.
      const message = `Request body must be sent as ${mediaTypes.join(' or ')}`;
      throw new errors.ValidationError(message, {
        errors: [{ path: ['body'], message, name: 'ValidationError', value: undefined }],
      });
    }

    return validateZodSchema(schema)(value);
  };
};
