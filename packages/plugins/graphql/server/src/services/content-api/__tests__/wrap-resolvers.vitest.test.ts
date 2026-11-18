import { buildSchema, graphql } from 'graphql';
import type { Core } from '@strapi/types';
import { describe, expect, it, vi } from 'vitest';

import { wrapResolvers } from '../wrap-resolvers';

const createSchema = () => {
  const schema = buildSchema('type Query { hello: String }');
  const queryType = schema.getQueryType()!;

  queryType.getFields().hello!.resolve = () => 'world';

  return schema;
};

/**
 * A registered Strapi middleware, as documented for routes:
 * a factory `(config, { strapi })` that returns a koa handler `(ctx, next)`
 */
const createRegisteredMiddleware = () => {
  const handler = vi.fn(async (_ctx: unknown, next: () => Promise<unknown>) => {
    await next();
  });
  const factory = vi.fn<(config: unknown, opts: { strapi: Core.Strapi }) => typeof handler>(
    () => handler
  );

  return { factory, handler };
};

const createStrapi = (middlewares: Record<string, unknown>) => {
  return {
    middleware: vi.fn((name: string) => middlewares[name]),
    get: vi.fn((name: string) => {
      if (name === 'policies') {
        return { resolve: () => [] };
      }

      throw new Error(`Unexpected registry ${name}`);
    }),
    auth: { verify: vi.fn() },
  } as unknown as Core.Strapi;
};

const executeHello = async (middlewaresConfig: unknown[], strapi: Core.Strapi) => {
  const koaContext = { state: {} };

  const schema = wrapResolvers({
    schema: createSchema(),
    strapi,
    extension: {
      resolversConfig: {
        'Query.hello': { auth: false, middlewares: middlewaresConfig },
      },
    },
  });

  const result = await graphql({
    schema,
    source: '{ hello }',
    contextValue: { state: {}, koaContext },
  });

  return { result, koaContext };
};

describe('wrapResolvers', () => {
  describe('resolversConfig middlewares', () => {
    it('runs an inline middleware with (resolve, parent, args, context, info)', async () => {
      const strapi = createStrapi({});
      const middleware = vi.fn((resolve, parent, args, context, info) =>
        resolve(parent, args, context, info)
      );

      const { result } = await executeHello([middleware], strapi);

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ hello: 'world' });
      expect(middleware).toHaveBeenCalledTimes(1);
      expect(middleware.mock.calls[0]![0]).toBeTypeOf('function');
    });

    it('runs a registered middleware referenced by name', async () => {
      const { factory, handler } = createRegisteredMiddleware();
      const strapi = createStrapi({ 'global::logger': factory });

      const { result, koaContext } = await executeHello(['global::logger'], strapi);

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ hello: 'world' });
      expect(factory).toHaveBeenCalledWith({}, { strapi });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0]).toBe(koaContext);
    });

    it('runs a registered middleware referenced by { name, options }', async () => {
      const { factory, handler } = createRegisteredMiddleware();
      const strapi = createStrapi({ 'global::logger': factory });
      const options = { level: 'debug' };

      const { result, koaContext } = await executeHello(
        [{ name: 'global::logger', options }],
        strapi
      );

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ hello: 'world' });
      expect(factory).toHaveBeenCalledWith(options, { strapi });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0]).toBe(koaContext);
    });

    it('passes the options to the handler created by the registered middleware', async () => {
      const seen: unknown[] = [];
      const factory = vi.fn(
        (config: { prefix: string }) => async (_ctx: unknown, next: () => Promise<unknown>) => {
          seen.push(config.prefix);
          await next();
        }
      );
      const strapi = createStrapi({ 'global::prefix': factory });

      const { result } = await executeHello(
        [{ name: 'global::prefix', options: { prefix: 'custom' } }],
        strapi
      );

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ hello: 'world' });
      expect(seen).toEqual(['custom']);
    });

    it('resolves the field to null when a registered middleware does not call next', async () => {
      const factory = vi.fn(() => async () => {});
      const strapi = createStrapi({ 'global::block': factory });

      const { result } = await executeHello(['global::block'], strapi);

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ hello: null });
    });

    it('runs the resolver once and rejects when a registered middleware calls next twice', async () => {
      const schema = buildSchema('type Mutation { create: String } type Query { hello: String }');
      const resolve = vi.fn(() => 'created');
      schema.getMutationType()!.getFields().create!.resolve = resolve;

      let secondCall: Promise<unknown> | undefined;
      const factory = vi.fn(() => async (_ctx: unknown, next: () => Promise<unknown>) => {
        await next();
        secondCall = next();
        await secondCall.catch(() => {});
      });
      const strapi = createStrapi({ 'global::retry': factory });

      const wrappedSchema = wrapResolvers({
        schema,
        strapi,
        extension: {
          resolversConfig: { 'Mutation.create': { auth: false, middlewares: ['global::retry'] } },
        },
      });

      await graphql({
        schema: wrappedSchema,
        source: 'mutation { create }',
        contextValue: { koaContext: {} },
      });

      expect(resolve).toHaveBeenCalledTimes(1);
      await expect(secondCall).rejects.toThrow('next() called multiple times');
    });

    it('creates the registered middleware handler once, not on each request', async () => {
      const { factory, handler } = createRegisteredMiddleware();
      const strapi = createStrapi({ 'global::logger': factory });

      const schema = wrapResolvers({
        schema: createSchema(),
        strapi,
        extension: {
          resolversConfig: { 'Query.hello': { auth: false, middlewares: ['global::logger'] } },
        },
      });

      await graphql({ schema, source: '{ hello }', contextValue: { koaContext: {} } });
      await graphql({ schema, source: '{ hello }', contextValue: { koaContext: {} } });

      expect(factory).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('throws when a referenced middleware is not registered', () => {
      const strapi = createStrapi({});

      expect(() =>
        wrapResolvers({
          schema: createSchema(),
          strapi,
          extension: {
            resolversConfig: { 'Query.hello': { middlewares: ['global::unknown'] } },
          },
        })
      ).toThrow('Middleware global::unknown not found.');
    });
  });
});
