import { createRequire } from 'node:module';
import { errors } from '@strapi/utils';
import { GraphQLError } from 'graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatGraphqlError } from '../format-graphql-error';

const { ApplicationError } = errors;

// Apollo's own CommonJS build checks `instanceof GraphQLError` against the CommonJS graphql
// package, while vitest resolves the `graphql` import above to the ESM build, a distinct class.
// Wrapping with the CommonJS class is what makes unwrapResolverError behave as it does at runtime
const graphqlCjs = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const { GraphQLError: ApolloGraphQLError } = graphqlCjs;

// Apollo calls formatError(formattedError, error) with the GraphQLError that wraps whatever a
// resolver threw, so the helper mirrors that shape. unwrapResolverError only unwraps an error
// that has a path, as graphql-js sets for every error raised inside a resolver
const formatResolverError = (originalError: unknown) => {
  const wrapped = new ApolloGraphQLError('wrapped resolver error', {
    originalError: originalError as Error,
    path: ['createPoolItem'],
  });

  return formatGraphqlError(wrapped.toJSON(), wrapped);
};

describe('formatGraphqlError', () => {
  const logError = vi.fn();

  beforeEach(() => {
    logError.mockReset();
    vi.stubGlobal('strapi', { log: { error: logError } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('errors that do not come from Strapi or GraphQL', () => {
    const internalError = Object.assign(
      new Error('select * from "pool_items" where "name" = \'a bound value\' - connection refused'),
      {
        details: {
          code: 'DB_POOL_ACQUIRE_TIMEOUT',
          hostname: 'strapi-host-1.internal',
          reason: "Access denied for user 'strapi'@'10.0.0.100'",
        },
      }
    );

    it('returns a generic 500 that does not carry the internal name, message or details', () => {
      const formatted = formatResolverError(internalError);

      expect(formatted).toBeInstanceOf(GraphQLError);
      expect(formatted.message).toBe('Internal Server Error');
      expect(formatted.extensions).toEqual({
        code: 'INTERNAL_SERVER_ERROR',
        error: { name: 'InternalServerError', message: 'Internal Server Error' },
      });
      expect(formatted.extensions).not.toHaveProperty('error.details');
    });

    it('does not leak anything from the internal error anywhere in the serialized response', () => {
      const serialized = JSON.stringify(formatResolverError(internalError));

      expect(serialized).not.toContain('pool_items');
      expect(serialized).not.toContain('a bound value');
      expect(serialized).not.toContain('DB_POOL_ACQUIRE_TIMEOUT');
      expect(serialized).not.toContain('strapi-host-1.internal');
      expect(serialized).not.toContain('Access denied');
    });

    it('still logs the full error server side', () => {
      formatResolverError(internalError);

      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith(internalError);
    });
  });

  describe('errors whose fields are all non-enumerable', () => {
    // An Error only has non-enumerable fields (message, stack), which lodash isEmpty reports as
    // empty, so these used to skip the sanitizing and reach the client as they were
    it.each([
      ['a bare Error', new Error('select secret from t')],
      ['a TypeError', new TypeError('select secret from t')],
    ])('returns the generic 500 for %s', (_label, error) => {
      const formatted = formatResolverError(error);

      expect(formatted.message).toBe('Internal Server Error');
      expect(formatted.extensions).toEqual({
        code: 'INTERNAL_SERVER_ERROR',
        error: { name: 'InternalServerError', message: 'Internal Server Error' },
      });
      expect(JSON.stringify(formatted)).not.toContain('select secret');
      expect(logError).toHaveBeenCalledWith(error);
    });
  });

  describe('errors that carry no original error', () => {
    it('returns a GraphQLError raised outside a resolver unchanged', () => {
      const validationError = new GraphQLError('Cannot query field "secret" on type "Query".');
      const formattedError = validationError.toJSON();

      expect(formatGraphqlError(formattedError, validationError)).toBe(formattedError);
      expect(logError).not.toHaveBeenCalled();
    });

    it.each([null, undefined])('returns the formatted error unchanged for %s', (missing) => {
      const formattedError = { message: 'no original error' };

      expect(formatGraphqlError(formattedError, missing)).toBe(formattedError);
      expect(logError).not.toHaveBeenCalled();
    });
  });

  describe('values that are not errors', () => {
    it.each([
      ['a string', 'secret string'],
      ['a number', 4242],
      ['a plain object', { secret: 'secret field' }],
    ])('does not throw for %s and returns the generic 500', (_label, value) => {
      const formattedError = { message: 'wrapper' };
      let formatted: GraphQLError | typeof formattedError | undefined;

      expect(() => {
        formatted = formatGraphqlError(formattedError, value);
      }).not.toThrow();
      expect(formatted).toBeInstanceOf(GraphQLError);
      expect(formatted?.message).toBe('Internal Server Error');
      expect(JSON.stringify(formatted)).not.toContain('secret');
    });

    it('reaches the generic 500 when a resolver throws a non-error value', async () => {
      // graphql-js wraps a thrown non-error value in an Error before it gets to formatError
      const schema = new graphqlCjs.GraphQLSchema({
        query: new graphqlCjs.GraphQLObjectType({
          name: 'Query',
          fields: {
            item: {
              type: graphqlCjs.GraphQLString,
              resolve() {
                throw 'secret string' as unknown as Error;
              },
            },
          },
        }),
      });

      const result = await graphqlCjs.graphql({ schema, source: '{ item }' });
      const [error] = result.errors ?? [];
      const formatted = formatGraphqlError(error.toJSON(), error);

      expect(formatted.message).toBe('Internal Server Error');
      expect(formatted.extensions).toEqual({
        code: 'INTERNAL_SERVER_ERROR',
        error: { name: 'InternalServerError', message: 'Internal Server Error' },
      });
      expect(JSON.stringify(formatted)).not.toContain('secret');
    });
  });

  describe('Strapi user-facing errors', () => {
    it('keeps the message and details of an ApplicationError', () => {
      const details = { field: 'name', hint: 'must be unique' };
      const formatted = formatResolverError(new ApplicationError('Name is already taken', details));

      expect(formatted.message).toBe('Name is already taken');
      expect(formatted.extensions).toEqual({
        code: 'STRAPI_APPLICATION_ERROR',
        error: { name: 'ApplicationError', message: 'Name is already taken', details },
      });
      expect(logError).not.toHaveBeenCalled();
    });
  });
});
