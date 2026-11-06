import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { koaCtx } from '../../engine/better-auth/__tests__/utils/koa-ctx';
import authController from '../auth';

const fakeStrapi = (
  handle: (request: Request) => Promise<Response>,
  ensureCurrent: () => Promise<void> = async () => undefined
) =>
  ({
    config: {
      get: (path: string) => (path === 'server.absoluteUrl' ? 'http://localhost:1337' : undefined),
    },
    plugin(name: string) {
      expect(name).toBe('end-users');

      return {
        service(service: string) {
          expect(service).toBe('engine');

          return { ensureCurrent, get: () => ({ handle }) };
        },
      };
    },
  }) as unknown as Core.Strapi;

describe('auth controller', () => {
  it('hands the request to the engine and writes its answer back', async () => {
    const handle = vi.fn(async () => Response.json({ ok: true }, { status: 201 }));
    const ctx = koaCtx({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { 'content-type': 'application/json' },
      body: { email: 'a@x.io' },
    });

    await authController({ strapi: fakeStrapi(handle) }).handle(ctx);

    expect(handle).toHaveBeenCalledTimes(1);

    const request = (handle.mock.calls[0] as unknown as [Request])[0];

    expect(request.method).toBe('POST');
    expect(new URL(request.url).pathname).toBe('/api/auth/sign-in/email');
    expect(await request.json()).toEqual({ email: 'a@x.io' });

    expect(ctx.status).toBe(201);
    expect(JSON.parse((ctx.body as Buffer).toString())).toEqual({ ok: true });
  });

  it('addresses the request to the configured server, never to the Host the client sent', async () => {
    const handle = vi.fn(async () => new Response(null, { status: 204 }));
    const ctx = koaCtx({ url: '/api/auth/ok', headers: { host: 'evil.example' } });

    await authController({ strapi: fakeStrapi(handle) }).handle(ctx);

    const request = (handle.mock.calls[0] as unknown as [Request])[0];

    expect(new URL(request.url).origin).toBe('http://localhost:1337');
  });

  it('lets an error of the engine reach Strapi’s error handling', async () => {
    const handle = vi.fn(async () => {
      throw new Error('engine down');
    });

    await expect(
      authController({ strapi: fakeStrapi(handle) }).handle(koaCtx({ url: '/api/auth/ok' }))
    ).rejects.toThrow('engine down');
  });

  it('serves on the engine in place when a changed setting could not be applied', async () => {
    const handle = vi.fn(async () => Response.json({ ok: true }));
    const ensureCurrent = vi.fn(async () => {
      throw new Error('bad provider');
    });
    const ctx = koaCtx({ url: '/api/auth/ok' });

    await authController({ strapi: fakeStrapi(handle, ensureCurrent) }).handle(ctx);

    expect(ensureCurrent).toHaveBeenCalledTimes(1);
    expect(handle).toHaveBeenCalledTimes(1);
    expect(ctx.status).toBe(200);
  });
});
