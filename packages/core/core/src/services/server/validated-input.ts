import createError from 'http-errors';
import type { Core } from '@strapi/types';
import { validateZodSchema, z } from '@strapi/utils';

type RequestContext = {
  params?: Record<string, string>;
  query?: unknown;
  request: { body?: unknown; is(types: string[]): string | false | null };
};

type InputPart = 'params' | 'query' | 'body';

type Parser = (ctx: RequestContext) => Record<string, unknown>;

// Request bodies whose values arrive as strings, like params and query values.
const FORM_MEDIA_TYPES = new Set(['multipart/form-data', 'application/x-www-form-urlencoded']);

// Mirrors `OPENAPI_SCHEMA_CONVERSION_OPTIONS` in @strapi/openapi, which converts request schemas.
const OPENAPI_CONVERSION = { target: 'draft-2020-12', io: 'output' } as const;

type SchemaDef = {
  type: string;
  coerce?: boolean;
  innerType?: z.ZodType;
  in?: z.ZodType;
  element?: z.ZodType;
  shape?: Record<string, z.ZodType>;
  options?: z.ZodType[];
  values?: unknown[];
};

const WRAPPER_TYPES = new Set([
  'optional',
  'nullable',
  'default',
  'prefault',
  'readonly',
  'catch',
  'nonoptional',
]);

/**
 * Returns why a schema can never parse the string values of a request correctly, or `undefined`.
 * Walks wrappers, pipes, arrays, objects and unions (a union passes when one option passes).
 *
 * `z.lazy`, records, tuples and intersections are not walked.
 */
const findStringIssue = (schema: z.ZodType, part: InputPart): string | undefined => {
  const def = schema._zod.def as unknown as SchemaDef;

  if (WRAPPER_TYPES.has(def.type) && def.innerType !== undefined) {
    return findStringIssue(def.innerType, part);
  }

  switch (def.type) {
    case 'pipe':
      return def.in === undefined ? undefined : findStringIssue(def.in, part);
    case 'array':
      return def.element === undefined ? undefined : findStringIssue(def.element, part);
    case 'object':
      for (const value of Object.values(def.shape ?? {})) {
        const issue = findStringIssue(value, part);

        if (issue !== undefined) {
          return issue;
        }
      }

      return undefined;
    case 'union': {
      const issues = (def.options ?? []).map((option) => findStringIssue(option, part));

      return issues.every((issue) => issue !== undefined) ? issues[0] : undefined;
    }
    case 'boolean':
      return def.coerce === true
        ? `z.coerce.boolean() turns 'false' into true. Use z.stringbool() instead.`
        : `${part} values are strings, so z.boolean() fails on every value. Use z.stringbool() instead.`;
    case 'number':
    case 'bigint':
      return def.coerce === true
        ? undefined
        : `${part} values are strings, so z.${def.type}() fails on every value. Use z.coerce.${def.type}() instead.`;
    case 'date':
      return `${part} values are strings, and z.${def.coerce === true ? 'coerce.' : ''}date() cannot be documented in OpenAPI. Use z.iso.date() or z.iso.datetime() instead.`;
    case 'literal':
      return (def.values ?? []).some((value) => typeof value === 'string')
        ? undefined
        : `${part} values are strings, so a non-string z.literal() never matches.`;
    default:
      return undefined;
  }
};

/**
 * The media type a body schema key stands for, without parameters: `'text/plain; charset=utf-8'`
 * matches a `text/plain` request. Throws for keys that cannot match exactly.
 */
const toMediaType = (key: string) => {
  const mediaType = key.split(';')[0].trim().toLowerCase();

  if (mediaType.includes('*') || mediaType.startsWith('+') || mediaType.includes('/') === false) {
    throw new TypeError(
      `request.body: "${key}" is not an exact media type. Use one such as application/json.`
    );
  }

  return mediaType;
};

/**
 * Throws when the `request` of a route cannot be parsed or documented as declared:
 *
 * - a `params`, `query` or form body schema that can never accept the strings a request carries,
 *   such as `z.number()` or `z.coerce.boolean()`;
 * - a body media type that cannot match a request exactly, such as `application/*`;
 * - a schema that cannot be converted to the JSON Schema of the OpenAPI document, such as
 *   `.transform()`. One such schema fails the generation of the whole document.
 */
export const assertRouteRequest = (request: Core.RouteRequest) => {
  const check = (location: string, part: InputPart, schema: z.ZodType, strings: boolean) => {
    const issue = strings === true ? findStringIssue(schema, part) : undefined;

    if (issue !== undefined) {
      throw new TypeError(`${location}: ${issue}`);
    }

    try {
      z.toJSONSchema(schema, OPENAPI_CONVERSION);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new TypeError(`${location}: the schema cannot be documented in OpenAPI (${reason}).`);
    }
  };

  for (const part of ['params', 'query'] as const) {
    for (const [key, schema] of Object.entries(request[part] ?? {})) {
      check(`request.${part}.${key}`, part, schema, true);
    }
  }

  for (const [key, schema] of Object.entries(request.body ?? {})) {
    check(`request.body["${key}"]`, 'body', schema, FORM_MEDIA_TYPES.has(toMediaType(key)));
  }
};

/**
 * Builds the function that parses a request with a route's `request` schemas.
 *
 * - `params` and `query` are parsed as objects: unknown keys are stripped, and no value is coerced
 *   unless its schema coerces it (`z.coerce.number()`, `z.stringbool()`).
 * - The body schema is the one of the request media type, matched without parameters. A request
 *   without a body parses `undefined` with the first declared schema, so an optional body passes.
 *   A body of an undeclared media type answers 415.
 * - On failure, throws a `ValidationError` (400) whose `details.errors[].path` starts with the part.
 *
 * koa-body parses no body for GET, HEAD and DELETE by default, so a body declared on these methods
 * always parses `undefined`.
 */
export const createValidatedInputParser = (request: Core.RouteRequest): Parser => {
  const shape: Record<string, z.ZodType> = {};

  for (const part of ['params', 'query'] as const) {
    const schemas = request[part];

    if (schemas !== undefined) {
      shape[part] = z.object(schemas);
    }
  }

  const bodySchemas = new Map<string, z.ZodType>();

  for (const [key, schema] of Object.entries(request.body ?? {})) {
    const mediaType = toMediaType(key);

    if (bodySchemas.has(mediaType)) {
      throw new TypeError(`request.body: "${mediaType}" is declared twice.`);
    }

    bodySchemas.set(mediaType, schema);
  }

  const mediaTypes = [...bodySchemas.keys()];

  if (mediaTypes.length === 0) {
    const schema = z.object(shape);

    return (ctx) => validateZodSchema(schema)({ params: { ...ctx.params }, query: ctx.query });
  }

  const schemasByMediaType = new Map(
    mediaTypes.map((mediaType) => [
      mediaType,
      z.object({ ...shape, body: bodySchemas.get(mediaType) as z.ZodType }),
    ])
  );

  return (ctx) => {
    const matched = ctx.request.is(mediaTypes);
    const hasBody = matched !== null;
    const mediaType = hasBody ? matched : mediaTypes[0];
    const schema = typeof mediaType === 'string' ? schemasByMediaType.get(mediaType) : undefined;

    if (schema === undefined) {
      const message = `Request body must be sent as ${mediaTypes.join(' or ')}`;
      throw createError(415, message, {
        details: { errors: [{ path: ['body'], message, name: 'UnsupportedMediaTypeError' }] },
      });
    }

    return validateZodSchema(schema)({
      params: { ...ctx.params },
      query: ctx.query,
      body: hasBody ? ctx.request.body : undefined,
    });
  };
};

// One parser per `request` object. Registration replaces `route.request` when it merges the params
// of `addQueryParams` and `addInputParams`, so the next parse builds a parser that includes them.
const parsers = new WeakMap<Core.RouteRequest, Parser>();
const NO_REQUEST: Core.RouteRequest = {};

/**
 * Parses the request with the current `request` schemas of `route`. The raw `ctx.params`,
 * `ctx.query` and `ctx.request.body` are left unchanged.
 */
export const parseRouteInput = (
  ctx: RequestContext,
  route: { request?: Core.RouteRequest }
): Record<string, unknown> => {
  const request = route.request ?? NO_REQUEST;
  let parse = parsers.get(request);

  if (parse === undefined) {
    parse = createValidatedInputParser(request);
    parsers.set(request, parse);
  }

  return parse(ctx);
};
