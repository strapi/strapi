import { errors, z } from '@strapi/utils';
import { describe, expect, test } from 'vitest';

import { createValidatedInputParser } from '../validated-input';

type FakeRequest = {
  params?: Record<string, string>;
  query?: unknown;
  body?: unknown;
  contentType?: string | null;
};

// `contentType` is the media type `ctx.request.is()` reports: null when the request has no body.
const createContext = ({ params = {}, query = {}, body, contentType = null }: FakeRequest) => ({
  params,
  query,
  request: {
    body,
    is(types: string[]) {
      if (contentType === null) {
        return null;
      }

      return types.includes(contentType) ? contentType : false;
    },
  },
});

const getValidationError = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    if (error instanceof errors.ValidationError) {
      return error;
    }

    throw error;
  }

  throw new Error('Expected a ValidationError');
};

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

      const error = getValidationError(() =>
        parse(createContext({ params: { id: 'abc' }, query: { sort: 'up' } }))
      );

      expect(error.details).toMatchObject({
        errors: [
          { path: ['params', 'id'], name: 'ValidationError' },
          { path: ['query', 'sort'], name: 'ValidationError' },
        ],
      });
    });

    test.each([
      ['z.number()', z.number(), 'Use z.coerce.number() instead'],
      ['z.number().optional()', z.number().optional(), 'Use z.coerce.number() instead'],
      ['z.bigint()', z.bigint(), 'Use z.coerce.bigint() instead'],
      ['z.boolean()', z.boolean(), 'Use z.stringbool() instead'],
      ['z.coerce.boolean()', z.coerce.boolean(), `turns 'false' into true`],
      ['z.coerce.boolean().default(false)', z.coerce.boolean().default(false), 'z.stringbool()'],
    ])('throws at definition for %s', (_, schema, message) => {
      expect(() => createValidatedInputParser({ query: { flag: schema } })).toThrow(message);
      expect(() => createValidatedInputParser({ params: { flag: schema } })).toThrow(
        'request.params.flag'
      );
    });

    test.each([
      ['z.coerce.number()', z.coerce.number()],
      ['z.stringbool()', z.stringbool()],
      ['z.enum()', z.enum(['a', 'b'])],
      ['z.union()', z.union([z.literal('all'), z.coerce.number()])],
    ])('accepts %s', (_, schema) => {
      expect(() => createValidatedInputParser({ query: { value: schema } })).not.toThrow();
    });
  });

  describe('body', () => {
    const parse = createValidatedInputParser({
      body: {
        'application/json': z.object({ amount: z.number() }),
        'multipart/form-data': z.object({ amount: z.coerce.number() }),
      },
    });

    test('uses the schema of the request content type', () => {
      expect(
        parse(createContext({ body: { amount: 5 }, contentType: 'application/json' }))
      ).toEqual({ body: { amount: 5 } });
      expect(
        parse(createContext({ body: { amount: '5' }, contentType: 'multipart/form-data' }))
      ).toEqual({ body: { amount: 5 } });
    });

    test('rejects a body that does not match its schema', () => {
      const error = getValidationError(() =>
        parse(createContext({ body: { amount: '5' }, contentType: 'application/json' }))
      );

      expect(error.details).toMatchObject({ errors: [{ path: ['body', 'amount'] }] });
    });

    test.each([
      ['another content type', 'text/plain'],
      ['no body', null],
    ])('rejects %s', (_, contentType) => {
      const error = getValidationError(() => parse(createContext({ body: {}, contentType })));

      expect(error.message).toBe(
        'Request body must be sent as application/json or multipart/form-data'
      );
      expect(error.details).toMatchObject({ errors: [{ path: ['body'] }] });
    });
  });

  test('returns only the declared parts', () => {
    const parse = createValidatedInputParser({});

    expect(parse(createContext({ params: { id: '1' }, query: { a: 'b' } }))).toEqual({});
  });
});
