import { describe, it, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import registerApplicationMiddlewares from '../register-middlewares';

const requiredMiddlewares = [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::query',
  'strapi::body',
  'strapi::public',
  'strapi::favicon',
];

const createStrapi = (middlewares: unknown) => {
  const use = vi.fn();
  const strapi = {
    config: { get: () => middlewares },
    middleware: () => () => (_ctx: unknown, next: () => Promise<void>) => next(),
    server: { use },
  } as unknown as Core.Strapi;

  return { strapi, use };
};

describe('registerApplicationMiddlewares', () => {
  it('accepts string and object entries', async () => {
    const { strapi, use } = createStrapi([
      ...requiredMiddlewares,
      { name: 'strapi::logger', config: { level: 'info' } },
    ]);

    await registerApplicationMiddlewares(strapi);

    expect(use).toHaveBeenCalledTimes(requiredMiddlewares.length + 1);
  });

  it('accepts inline function entries, as Core.Config.Middlewares allows', async () => {
    const inline: Core.MiddlewareHandler = (_ctx, next) => next();
    const middlewares = [inline, ...requiredMiddlewares] satisfies Core.Config.Middlewares;
    const { strapi, use } = createStrapi(middlewares);

    await registerApplicationMiddlewares(strapi);

    expect(use).toHaveBeenNthCalledWith(1, inline);
  });

  it.each([[42], [null], [{ name: 'strapi::logger', unknown: true }]])(
    'rejects invalid entry %j',
    async (entry) => {
      const { strapi } = createStrapi([...requiredMiddlewares, entry]);

      await expect(registerApplicationMiddlewares(strapi)).rejects.toThrow(
        'Invalid middleware configuration'
      );
    }
  );
});
