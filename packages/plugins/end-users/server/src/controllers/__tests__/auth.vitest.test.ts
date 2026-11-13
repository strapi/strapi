import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { koaCtx } from '../../engine/better-auth/__tests__/utils/koa-ctx';
import authController from '../auth';

const TRUSTED = 'https://app.example.com';
const UNTRUSTED = 'https://evil.example';

const isTrustedOrigin = async (origin: string) => origin === TRUSTED;

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

          return { ensureCurrent, get: () => ({ handle, isTrustedOrigin }) };
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

  describe('the session cookie on a read', () => {
    const COOKIE = 'strapi.session_token=good.sig';

    const cookieSent = async (method: string, headers: Record<string, string>) => {
      const handle = vi.fn(async () => Response.json({}));
      const ctx = koaCtx({
        method,
        url: '/api/auth/get-session',
        headers: { cookie: COOKIE, ...headers },
      });

      await authController({ strapi: fakeStrapi(handle) }).handle(ctx);

      return (handle.mock.calls[0] as unknown as [Request])[0].headers.get('cookie');
    };

    it.each(['GET', 'HEAD'])(
      'is not sent on for a %s from a page of an origin that is not trusted',
      async (method) => {
        // The answer (get-session holds the session token) must not reach that page
        expect(await cookieSent(method, { origin: UNTRUSTED })).toBeNull();
        expect(await cookieSent(method, { origin: 'null' })).toBeNull();
      }
    );

    it('is sent on from a trusted origin, or with no Origin (a link followed)', async () => {
      expect(await cookieSent('GET', { origin: TRUSTED })).toBe(COOKIE);
      expect(await cookieSent('GET', { referer: `${UNTRUSTED}/page` })).toBe(COOKIE);
    });

    it('is sent on for a write: the engine checks the origin of those itself', async () => {
      expect(await cookieSent('POST', { origin: UNTRUSTED })).toBe(COOKIE);
    });
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
