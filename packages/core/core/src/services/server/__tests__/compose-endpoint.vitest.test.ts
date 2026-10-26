import { describe, expect, test, vi } from 'vitest';
import type { Core } from '@strapi/types';
import type Router from '@koa/router';

import createEndpointComposer from '../compose-endpoint';

/**
 * The endpoint composer registers a route on the router with the route's controller action,
 * resolved from the route handler and the route info, behind its route middlewares.
 */

type Handler = (ctx: any, next?: () => Promise<unknown>) => Promise<unknown>;

const controllerFor = (label: string) => ({
  find: vi.fn(async () => ({ from: label })),
});

const setup = () => {
  const controllers = {
    'admin::user': controllerFor('admin::user'),
    'api::article.article': controllerFor('api::article.article'),
    'plugin::upload.file': controllerFor('plugin::upload.file'),
  } as Record<string, ReturnType<typeof controllerFor>>;
  const pluginController = vi.fn((name: string) => controllers[`plugin::upload.${name}`]);
  const middlewares: Record<string, Core.MiddlewareFactory> = {
    'global::tag': (config: any) => async (ctx, next) => {
      ctx.state.tags = [...(ctx.state.tags ?? []), config.tag ?? 'default'];
      await next();
    },
  };

  const strapi = {
    controller: vi.fn((uid: string) => controllers[uid]),
    plugin: vi.fn(() => ({ controller: pluginController })),
    middleware: vi.fn((name: string) => middlewares[name]),
    get: vi.fn((name: string) => {
      if (name === 'auth') {
        return {
          authenticate: (_ctx: unknown, next: () => Promise<unknown>) => next(),
          // Every request is authorized
          verify: vi.fn(async () => undefined),
        };
      }
      return { resolve: () => [] };
    }),
  } as unknown as Core.Strapi;

  const routes = new Map<string, Handler>();
  const router = {
    get: (path: string, handler: Handler) => routes.set(`GET ${path}`, handler),
  } as unknown as Router;

  const compose = createEndpointComposer(strapi);
  const register = (route: Partial<Core.Route>) => {
    compose({ method: 'GET', path: '/items', ...route } as Core.Route, { router });
    return routes.get('GET /items')!;
  };
  const call = async (handler: Handler) => {
    const ctx: any = { state: {}, body: undefined };
    await handler(ctx, async () => {});
    return ctx;
  };

  return { strapi, controllers, pluginController, register, call };
};

describe('compose endpoint', () => {
  test('resolves an admin controller from the admin plugin route info', async () => {
    const { register, call } = setup();

    const ctx = await call(register({ handler: 'user.find', info: { pluginName: 'admin' } }));

    expect(ctx.body).toEqual({ from: 'admin::user' });
  });

  test('resolves a plugin controller through the plugin', async () => {
    const { register, call, pluginController } = setup();

    const ctx = await call(register({ handler: 'file.find', info: { pluginName: 'upload' } }));

    expect(pluginController).toHaveBeenCalledWith('file');
    expect(ctx.body).toEqual({ from: 'plugin::upload.file' });
  });

  test('resolves an api controller from the api route info', async () => {
    const { register, call } = setup();

    const ctx = await call(register({ handler: 'article.find', info: { apiName: 'article' } }));

    expect(ctx.body).toEqual({ from: 'api::article.article' });
  });

  test('falls back to the handler controller uid', async () => {
    const { register, call } = setup();

    const ctx = await call(register({ handler: 'api::article.article.find', info: {} }));

    expect(ctx.body).toEqual({ from: 'api::article.article' });
  });

  test('reports a handler whose action does not exist', () => {
    const { register } = setup();

    expect(() => register({ handler: 'article.missing', info: { apiName: 'article' } })).toThrow(
      'Error creating endpoint GET /items: Handler not found "article.missing"'
    );
  });

  test('runs the route middlewares named by string and by config object', async () => {
    const { register, call } = setup();

    const ctx = await call(
      register({
        handler: 'article.find',
        info: { apiName: 'article' },
        config: { middlewares: ['global::tag', { name: 'global::tag', config: { tag: 'named' } }] },
      })
    );

    expect(ctx.state.tags).toEqual(['default', 'named']);
    expect(ctx.body).toEqual({ from: 'api::article.article' });
  });
});
