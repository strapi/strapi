import { errors, z } from '@strapi/utils';
import { describe, expect, test } from 'vitest';

import {
  assertRouteRequest,
  createValidatedInputParser,
  parseRouteInput,
} from '../validated-input';

type FakeRequest = {
  params?: Record<string, string>;
  query?: unknown;
  body?: unknown;
  contentType?: string | null;
};

/**
 * `contentType` is the request `Content-Type` header, null when the request has no body. `is()`
 * behaves as Koa's for exact media types: it ignores the header parameters and returns the matched
 * type, false for another type, null without a body. Real requests are in define-route.vitest.test.ts.
 */
const createContext = ({ params = {}, query = {}, body, contentType = null }: FakeRequest) => ({
  params,
  query,
  request: {
    body,
    is(types: string[]) {
      if (contentType === null) {
        return null;
      }

      const mediaType = contentType.split(';')[0].trim();

      return types.includes(mediaType) ? mediaType : false;
    },
  },
});

const getError = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return error as Error & { status?: number; details?: unknown };
  }

  throw new Error('Expected an error');
};

describe('assertRouteRequest', () => {
  test.each([
    ['z.number()', z.number(), 'Use z.coerce.number() instead'],
    ['z.number().optional()', z.number().optional(), 'Use z.coerce.number() instead'],
    ['z.bigint()', z.bigint(), 'Use z.coerce.bigint() instead'],
    ['z.boolean()', z.boolean(), 'Use z.stringbool() instead'],
    ['z.coerce.boolean()', z.coerce.boolean(), `turns 'false' into true`],
    ['z.coerce.boolean().default(false)', z.coerce.boolean().default(false), 'z.stringbool()'],
    ['z.date()', z.date(), 'Use z.iso.date() or z.iso.datetime() instead'],
    ['z.literal(1)', z.literal(1), 'non-string z.literal()'],
    ['z.array(z.number())', z.array(z.number()), 'Use z.coerce.number() instead'],
    [
      'a nested z.number()',
      z.object({ page: z.number(), withCount: z.stringbool() }).optional(),
      'Use z.coerce.number() instead',
    ],
  ])('rejects %s in params and query', (_, schema, message) => {
    expect(() => assertRouteRequest({ query: { value: schema } })).toThrow(message);
    expect(() => assertRouteRequest({ params: { value: schema } })).toThrow('request.params.value');
  });

  test.each([
    ['z.coerce.number()', z.coerce.number()],
    ['z.stringbool()', z.stringbool()],
    ['z.enum()', z.enum(['a', 'b'])],
    ['z.literal()', z.literal('all')],
    ['z.union()', z.union([z.literal('all'), z.number()])],
    ['z.array(z.coerce.number())', z.array(z.coerce.number())],
    ['a pipe from a string', z.string().trim().min(1).pipe(z.coerce.number().int())],
    ['z.iso.datetime()', z.iso.datetime()],
  ])('accepts %s in params and query', (_, schema) => {
    expect(() => assertRouteRequest({ query: { value: schema } })).not.toThrow();
  });

  test('checks form bodies like query values, and JSON bodies only for OpenAPI', () => {
    const body = z.object({ amount: z.number() });

    expect(() => assertRouteRequest({ body: { 'multipart/form-data': body } })).toThrow(
      'request.body["multipart/form-data"]: body values are strings'
    );
    expect(() => assertRouteRequest({ body: { 'application/json': body } })).not.toThrow();
  });

  test('rejects a schema that OpenAPI cannot document', () => {
    expect(() =>
      assertRouteRequest({
        body: { 'application/json': z.object({ amount: z.string().transform(Number) }) },
      })
    ).toThrow('request.body["application/json"]: the schema cannot be documented in OpenAPI');
  });

  test.each(['application/*', '+json', 'json'])('rejects the media type %s', (mediaType) => {
    expect(() => assertRouteRequest({ body: { [mediaType]: z.object({}) } })).toThrow(
      'is not an exact media type'
    );
  });
});

describe('createValidatedInputParser', () => {
  describe('params and query', () => {
    test('coerces only through the schema', () => {
      const parse = createValidatedInputParser({
        params: { id: z.coerce.number().int(), slug: z.string() },
        query: { notify: z.stringbool(), page: z.coerce.number().default(1) },
      });

      const input = parse(
        createContext({ params: { id: '7', slug: 'x' }, query: { notify: 'false' } })
      );

      expect(input).toEqual({ params: { id: 7, slug: 'x' }, query: { notify: false, page: 1 } });
    });

    test('strips unknown keys and leaves the raw values unchanged', () => {
      const parse = createValidatedInputParser({ query: { page: z.coerce.number() } });
      const query = { page: '2', _: '1700000000', filters: { title: 'a' } };

      const input = parse(createContext({ query }));

      expect(input).toEqual({ query: { page: 2 } });
      expect(query).toEqual({ page: '2', _: '1700000000', filters: { title: 'a' } });
    });

    test('parses nested qs objects', () => {
      const parse = createValidatedInputParser({
        query: {
          pagination: z
            .object({ page: z.coerce.number(), withCount: z.stringbool().optional() })
            .optional(),
        },
      });

      const input = parse(
        createContext({ query: { pagination: { page: '3', withCount: 'true' } } })
      );

      expect(input).toEqual({ query: { pagination: { page: 3, withCount: true } } });
    });

    test('rejects with every issue, prefixed by its part', () => {
      const parse = createValidatedInputParser({
        params: { id: z.coerce.number().int() },
        query: { sort: z.enum(['asc', 'desc']) },
      });

      const error = getError(() =>
        parse(createContext({ params: { id: 'abc' }, query: { sort: 'up' } }))
      );

      expect(error).toBeInstanceOf(errors.ValidationError);
      expect(error.details).toMatchObject({
        errors: [
          { path: ['params', 'id'], name: 'ValidationError' },
          { path: ['query', 'sort'], name: 'ValidationError' },
        ],
      });
    });
  });

  describe('body', () => {
    const parse = createValidatedInputParser({
      body: {
        'application/json': z.object({ amount: z.number() }),
        'multipart/form-data': z.object({ amount: z.coerce.number() }),
      },
    });

    test('uses the schema of the request media type, without its parameters', () => {
      expect(
        parse(
          createContext({ body: { amount: 5 }, contentType: 'application/json; charset=utf-8' })
        )
      ).toEqual({ body: { amount: 5 } });
      expect(
        parse(createContext({ body: { amount: '5' }, contentType: 'multipart/form-data' }))
      ).toEqual({ body: { amount: 5 } });
    });

    test('matches a declared media type that has parameters', () => {
      const parseText = createValidatedInputParser({
        body: { 'text/plain; charset=utf-8': z.string() },
      });

      expect(parseText(createContext({ body: 'hi', contentType: 'text/plain' }))).toEqual({
        body: 'hi',
      });
    });

    test('rejects a body that does not match its schema', () => {
      const error = getError(() =>
        parse(createContext({ body: { amount: '5' }, contentType: 'application/json' }))
      );

      expect(error).toBeInstanceOf(errors.ValidationError);
      expect(error.details).toMatchObject({ errors: [{ path: ['body', 'amount'] }] });
    });

    test('answers 415 for an undeclared media type', () => {
      const error = getError(() => parse(createContext({ body: 'x', contentType: 'text/plain' })));

      expect(error.status).toBe(415);
      expect(error.message).toBe(
        'Request body must be sent as application/json or multipart/form-data'
      );
      expect(error.details).toMatchObject({ errors: [{ path: ['body'] }] });
    });

    test('parses a request without a body as an undefined body', () => {
      const parseOptional = createValidatedInputParser({
        body: { 'application/json': z.object({ amount: z.number() }).optional() },
      });

      expect(parseOptional(createContext({ body: {} }))).toEqual({ body: undefined });

      const error = getError(() => parse(createContext({ body: {} })));

      expect(error).toBeInstanceOf(errors.ValidationError);
      expect(error.details).toMatchObject({ errors: [{ path: ['body'] }] });
    });

    test('parses a missing body as valid when the body is optional', () => {
      const request = { body: { 'application/json': z.object({ clientMutationId: z.string() }) } };

      expect(() => createValidatedInputParser(request)(createContext({ body: {} }))).toThrow();
      expect(
        createValidatedInputParser(request, { bodyOptional: true })(createContext({ body: {} }))
      ).toEqual({ body: undefined });
    });

    test('parses a body of an undeclared media type as no body when the body is optional', () => {
      const request = { body: { 'application/json': z.object({ clientMutationId: z.string() }) } };
      const ctx = createContext({ body: { file: 'x' }, contentType: 'multipart/form-data' });

      expect(() => createValidatedInputParser(request)(ctx)).toThrow(
        'Request body must be sent as'
      );
      expect(createValidatedInputParser(request, { bodyOptional: true })(ctx)).toEqual({
        body: undefined,
      });
    });

    test('treats an empty body as no body', () => {
      const ctx = createContext({ body: {}, contentType: 'text/plain' });
      const emptyCtx = { ...ctx, request: { ...ctx.request, length: 0 } };

      expect(() => parse(ctx)).toThrow('Request body must be sent as');
      expect(() => parse(emptyCtx)).toThrow('Invalid input: expected object, received undefined');
    });

    test('rejects a media type declared twice', () => {
      expect(() =>
        createValidatedInputParser({
          body: { 'text/plain': z.string(), 'text/plain; charset=utf-8': z.string() },
        })
      ).toThrow('"text/plain" is declared twice');
    });
  });

  test('returns only the declared parts', () => {
    const parse = createValidatedInputParser({});

    expect(parse(createContext({ params: { id: '1' }, query: { a: 'b' } }))).toEqual({});
  });
});

describe('parseRouteInput', () => {
  test('parses with the current request of the route', () => {
    const route = { request: { query: { page: z.coerce.number() } } };
    const ctx = createContext({ query: { page: '2', search: 'x' } });

    expect(parseRouteInput(ctx, route)).toEqual({ query: { page: 2 } });

    // As registration does when it merges the params of `addQueryParams`.
    route.request = { query: { ...route.request.query, search: z.string() } as never };

    expect(parseRouteInput(ctx, route)).toEqual({ query: { page: 2, search: 'x' } });
  });

  test('parses nothing for a route without request', () => {
    expect(parseRouteInput(createContext({ query: { a: 'b' } }), {})).toEqual({});
  });
});
