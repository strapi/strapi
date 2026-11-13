import type Koa from 'koa';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requestPathname, toFetchRequest, writeFetchResponse } from '../handler';
import { koaCtx } from './utils/koa-ctx';

const bodyText = (ctx: Koa.Context) => (ctx.body as Buffer).toString('utf8');

const stubStrapiConfig = (values: Record<string, unknown>) =>
  vi.stubGlobal('strapi', { config: { get: (path: string) => values[path] } });

describe('toFetchRequest', () => {
  beforeEach(() => {
    // what Strapi derives when the project did not set `url`
    stubStrapiConfig({ 'server.absoluteUrl': 'http://localhost:1337' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the client IP Koa reports', () => {
    const req = toFetchRequest(koaCtx({ ip: '203.0.113.9', headers: {} }));

    expect(req.headers.get('x-forwarded-for')).toBe('203.0.113.9');
  });

  it('keeps the method, path, query and body', async () => {
    const req = toFetchRequest(
      koaCtx({ method: 'POST', url: '/api/auth/sign-in/email?x=1', body: { email: 'a@x.io' } })
    );

    expect(req.method).toBe('POST');
    expect(new URL(req.url).pathname).toBe('/api/auth/sign-in/email');
    expect(new URL(req.url).search).toBe('?x=1');
    expect(await req.json()).toEqual({ email: 'a@x.io' });
  });

  it('overwrites an X-Forwarded-For the client sent when Koa does not trust a proxy', () => {
    const req = toFetchRequest(
      koaCtx({ ip: '203.0.113.9', headers: { 'x-forwarded-for': '1.2.3.4' } })
    );

    expect(req.headers.get('x-forwarded-for')).toBe('203.0.113.9');
  });

  describe('behind a proxy Koa trusts (server.proxy.koa)', () => {
    // Koa's `ip` is the first of the addresses it believes in. With `maxIpsCount` 0 (the default) it
    // believes the whole X-Forwarded-For header, so `ip` is the LEFTMOST entry, which the client
    // wrote. The handler forwards what Koa reports; making that trustworthy is `maxIpsCount`.
    const chain = { 'x-forwarded-for': 'spoofed-by-client, 198.51.100.7' };

    it('forwards the leftmost entry when Koa trusts the whole header: the client can choose it', () => {
      const req = toFetchRequest(
        koaCtx({ proxy: true, ip: '10.0.0.1', headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } })
      );

      expect(req.headers.get('x-forwarded-for')).toBe('1.2.3.4');
    });

    it('forwards the entry the proxy added when Koa is told how many hops to believe', () => {
      const req = toFetchRequest(
        koaCtx({ proxy: true, maxIpsCount: 1, ip: '10.0.0.1', headers: chain })
      );

      expect(req.headers.get('x-forwarded-for')).toBe('198.51.100.7');
    });

    it('always sends one address, never the chain', () => {
      for (const maxIpsCount of [0, 1, 2]) {
        const req = toFetchRequest(
          koaCtx({ proxy: true, maxIpsCount, ip: '10.0.0.1', headers: chain })
        );

        expect(req.headers.get('x-forwarded-for'), String(maxIpsCount)).not.toContain(',');
      }
    });
  });

  it('drops X-Forwarded-For when Koa has no client address', () => {
    const req = toFetchRequest(koaCtx({ headers: { 'x-forwarded-for': '1.2.3.4' } }));

    expect(req.headers.has('x-forwarded-for')).toBe(false);
  });

  describe('address', () => {
    it('is the configured origin, with the path and the query from Koa', () => {
      expect(toFetchRequest(koaCtx({ url: '/api/auth/ok?x=1' })).url).toBe(
        'http://localhost:1337/api/auth/ok?x=1'
      );
    });

    it('prefers server.url to the address Strapi derived', () => {
      stubStrapiConfig({
        'server.url': 'https://api.example.com',
        'server.absoluteUrl': 'http://localhost:1337',
      });

      const req = toFetchRequest(koaCtx({ url: '/api/auth/ok' }));

      expect(req.url).toBe('https://api.example.com/api/auth/ok');
      expect(req.headers.get('host')).toBe('api.example.com');
      expect(req.headers.get('x-forwarded-proto')).toBe('https');
    });

    it('takes an origin it is given over the configuration', () => {
      const req = toFetchRequest(koaCtx({ url: '/api/auth/ok' }), 'https://other.example.com');

      expect(req.url).toBe('https://other.example.com/api/auth/ok');
    });

    it('ignores a Host the client chose, a forwarded one included', () => {
      for (const proxy of [false, true]) {
        const req = toFetchRequest(
          koaCtx({
            proxy,
            url: '/api/auth/request-password-reset',
            headers: {
              host: 'evil.example',
              'x-forwarded-host': 'evil.example',
              'x-forwarded-proto': 'https',
              forwarded: 'host=evil.example;proto=https',
            },
          })
        );

        expect(new URL(req.url).origin, `proxy ${proxy}`).toBe('http://localhost:1337');
        expect(req.headers.get('host')).toBe('localhost:1337');
        expect(req.headers.get('x-forwarded-host')).toBe('localhost:1337');
        expect(req.headers.get('x-forwarded-proto')).toBe('http');
      }
    });

    it('does not let a path that looks like a host choose the host', () => {
      expect(toFetchRequest(koaCtx({ url: '//evil.example/api/auth/ok' })).url).toBe(
        'http://localhost:1337//evil.example/api/auth/ok'
      );
    });

    it('does not take the host of an absolute-form request target either', () => {
      expect(toFetchRequest(koaCtx({ url: 'http://evil.example/api/auth/ok?y=2' })).url).toBe(
        'http://localhost:1337/api/auth/ok?y=2'
      );
    });

    it('does not start without an address: it never falls back to the request', () => {
      stubStrapiConfig({});

      expect(() => toFetchRequest(koaCtx({ headers: { host: 'evil.example' } }))).toThrow(
        /server\.url/
      );
    });
  });

  it('keeps the cookie, authorization and origin headers', () => {
    const req = toFetchRequest(
      koaCtx({
        headers: {
          cookie: 'strapi.session_token=abc',
          authorization: 'Bearer abc',
          origin: 'https://app.example.com',
          'user-agent': 'vitest',
        },
      })
    );

    expect(req.headers.get('cookie')).toBe('strapi.session_token=abc');
    expect(req.headers.get('authorization')).toBe('Bearer abc');
    expect(req.headers.get('origin')).toBe('https://app.example.com');
    expect(req.headers.get('user-agent')).toBe('vitest');
  });

  it('sends a JSON body as JSON, keeps the content type it came with, and drops the stale content-length', async () => {
    const req = toFetchRequest(
      koaCtx({
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8', 'content-length': '999' },
        body: { name: 'Zoë' },
      })
    );

    expect(req.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(req.headers.get('content-length')).toBeNull();
    expect(await req.json()).toEqual({ name: 'Zoë' });
  });

  it('does not turn another content type into JSON: Better Auth decides on the type the client sent', async () => {
    // koa-body also parses these into an object; labeling them application/json would let a
    // cross-site form post reach endpoints that only take JSON
    for (const type of ['application/vnd.api+json', 'application/csp-report']) {
      const req = toFetchRequest(
        koaCtx({ method: 'POST', headers: { 'content-type': type }, body: { a: 1 } })
      );

      expect(req.headers.get('content-type'), type).toBe(type);
    }
  });

  it('does not label a body that came without a content type as JSON', () => {
    const req = toFetchRequest(koaCtx({ method: 'POST', body: { a: 1 } }));

    // a string body gets text/plain from the Request itself, which Better Auth refuses (415)
    expect(req.headers.get('content-type') ?? '').not.toContain('json');
  });

  it('keeps a multipart body multipart, with the fields the parser read', async () => {
    const req = toFetchRequest(
      koaCtx({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=----x', 'content-length': '10' },
        body: { username: 'alice', password: 'secret', tag: ['a', 'b'] },
      })
    );

    expect(req.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/);
    expect(req.headers.get('content-length')).toBeNull();

    const form = await req.formData();

    expect(form.get('username')).toBe('alice');
    expect(form.getAll('tag')).toEqual(['a', 'b']);
  });

  it('re-encodes a form body as a form body', async () => {
    const req = toFetchRequest(
      koaCtx({
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: { email: 'a@x.io', tag: ['one', 'two'] },
      })
    );

    expect(req.headers.get('content-type')).toContain('application/x-www-form-urlencoded');

    const form = new URLSearchParams(await req.text());

    expect(form.get('email')).toBe('a@x.io');
    expect(form.getAll('tag')).toEqual(['one', 'two']);
  });

  it('passes a string body through untouched', async () => {
    const req = toFetchRequest(
      koaCtx({ method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'hello' })
    );

    expect(await req.text()).toBe('hello');
  });

  it('sends no body for GET and HEAD, even when the parser left an empty object', () => {
    expect(toFetchRequest(koaCtx({ method: 'GET', body: {} })).body).toBeNull();
    expect(toFetchRequest(koaCtx({ method: 'HEAD', body: {} })).body).toBeNull();
  });

  it('sends no body for a POST without one', () => {
    expect(toFetchRequest(koaCtx({ method: 'POST', body: undefined })).body).toBeNull();
  });

  describe('the empty body Strapi’s parser leaves', () => {
    // koa-body only parses POST, PUT and PATCH; for every other method it sets `body` to `{}`
    it('sends no body, and no content type, for an empty object without a content type', () => {
      for (const method of ['DELETE', 'OPTIONS', 'PUT', 'POST']) {
        const req = toFetchRequest(koaCtx({ method, body: {} }));

        expect(req.body, method).toBeNull();
        expect(req.headers.get('content-type'), method).toBeNull();
      }
    });

    it('keeps an empty JSON object that came with a JSON content type', async () => {
      const req = toFetchRequest(
        koaCtx({ method: 'POST', headers: { 'content-type': 'application/json' }, body: {} })
      );

      expect(await req.json()).toEqual({});
    });

    it('keeps an object that has something in it, content type or not', async () => {
      const req = toFetchRequest(koaCtx({ method: 'DELETE', body: { reason: 'x' } }));

      expect(await req.text()).toBe('{"reason":"x"}');
    });
  });

  describe('the content type is the media type, not whatever the header mentions', () => {
    it('does not take a content type that only mentions the form type for a form', async () => {
      const type = 'text/plain; note=application/x-www-form-urlencoded';
      const req = toFetchRequest(
        koaCtx({ method: 'POST', headers: { 'content-type': type }, body: { email: 'a@x.io' } })
      );

      expect(req.headers.get('content-type')).toBe(type);
      expect(await req.text()).toBe('{"email":"a@x.io"}');
    });

    it('does not take a content type that only mentions the multipart type for multipart', async () => {
      const type = 'application/vnd.example+json; profile="multipart/form-data"';
      const req = toFetchRequest(
        koaCtx({ method: 'POST', headers: { 'content-type': type }, body: { a: '1' } })
      );

      expect(req.headers.get('content-type')).toBe(type);
      expect(await req.text()).toBe('{"a":"1"}');
    });

    it('takes the form type with parameters and in any case for a form', async () => {
      for (const type of [
        'application/x-www-form-urlencoded; charset=UTF-8',
        'Application/X-WWW-Form-Urlencoded',
        ' application/x-www-form-urlencoded ;charset=utf-8',
      ]) {
        const req = toFetchRequest(
          koaCtx({ method: 'POST', headers: { 'content-type': type }, body: { email: 'a@x.io' } })
        );

        expect(new URLSearchParams(await req.text()).get('email'), type).toBe('a@x.io');
      }
    });

    it('takes multipart in any case for multipart', async () => {
      const req = toFetchRequest(
        koaCtx({
          method: 'POST',
          headers: { 'content-type': 'Multipart/Form-Data; boundary=----x' },
          body: { a: '1' },
        })
      );

      expect(((await req.formData()) as FormData).get('a')).toBe('1');
    });
  });
});

describe('requestPathname', () => {
  // The allow-list judges a request by this path, so it must be the path Better Auth will route
  // on: the one of the Request `toFetchRequest` builds, dot segments resolved and all.
  const targets = [
    '/api/auth/sign-in/email',
    '/api/auth/sign-in/email?x=1#frag',
    '/api/auth/x/../admin/list-users',
    '/api/auth/./admin/list-users',
    '/api/auth/x/%2e%2e/admin/list-users',
    '/api/auth/x/.%2E/admin/list-users',
    '/api/auth//admin/list-users',
    '/api/auth/admin/',
    '/api/auth/%61dmin/list-users',
    '/api/auth/admin\\list-users',
    '//evil.example/api/auth/ok',
    'http://evil.example/api/auth/admin/list-users',
  ];

  beforeEach(() => {
    vi.stubGlobal('strapi', {
      config: {
        get: (path: string) =>
          path === 'server.absoluteUrl' ? 'http://localhost:1337' : undefined,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(targets)('is the path of the Fetch Request for %s', (target) => {
    const ctx = koaCtx({ url: target });

    expect(requestPathname(ctx)).toBe(new URL(toFetchRequest(ctx).url).pathname);
  });

  it('resolves the dot segments that hide an admin endpoint', () => {
    expect(requestPathname(koaCtx({ url: '/api/auth/x/../admin/list-users' }))).toBe(
      '/api/auth/admin/list-users'
    );
  });

  it('keeps an empty segment, which Better Auth refuses', () => {
    expect(requestPathname(koaCtx({ url: '/api/auth//admin/list-users' }))).toBe(
      '/api/auth//admin/list-users'
    );
  });
});

describe('writeFetchResponse', () => {
  it('copies every Set-Cookie header back to Koa', async () => {
    const ctx = koaCtx();
    const res = new Response('{}', {
      headers: [
        ['set-cookie', 'a=1'],
        ['set-cookie', 'b=2'],
      ],
    });

    await writeFetchResponse(ctx, res);

    expect(ctx.response.headers['set-cookie']).toEqual(['a=1', 'b=2']);
  });

  it('keeps a single Set-Cookie as a list', async () => {
    const ctx = koaCtx();

    await writeFetchResponse(ctx, new Response('{}', { headers: { 'set-cookie': 'a=1' } }));

    expect(ctx.response.headers['set-cookie']).toEqual(['a=1']);
  });

  it('adds to cookies other middleware already set instead of replacing them', async () => {
    const ctx = koaCtx();
    ctx.append('Set-Cookie', 'csrf=1');

    await writeFetchResponse(ctx, new Response('{}', { headers: { 'set-cookie': 'a=1' } }));

    expect(ctx.response.headers['set-cookie']).toEqual(['csrf=1', 'a=1']);
  });

  it('copies the status, the headers and the body', async () => {
    const ctx = koaCtx();
    const res = new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'content-type': 'application/json', 'set-auth-token': 'tok' },
    });

    await writeFetchResponse(ctx, res);

    expect(ctx.status).toBe(201);
    expect(ctx.response.get('content-type')).toContain('application/json');
    expect(ctx.response.get('set-auth-token')).toBe('tok');
    expect(JSON.parse(bodyText(ctx))).toEqual({ ok: true });
  });

  it('lets Koa work out the length instead of copying the upstream one', async () => {
    const ctx = koaCtx();
    const res = new Response('{"ok":true}', {
      headers: { 'content-length': '999', 'transfer-encoding': 'chunked', connection: 'close' },
    });

    await writeFetchResponse(ctx, res);

    expect(ctx.response.get('content-length')).toBe('11');
    expect(ctx.response.get('transfer-encoding')).toBe('');
    expect(ctx.response.get('connection')).toBe('');
  });

  it('keeps a redirect a redirect: the empty body must not turn 302 into 204', async () => {
    const ctx = koaCtx();
    const res = new Response(null, {
      status: 302,
      headers: { location: 'https://app.example.com/' },
    });

    await writeFetchResponse(ctx, res);

    expect(ctx.status).toBe(302);
    expect(ctx.response.get('location')).toBe('https://app.example.com/');
    expect(ctx.body).toBeNull();
  });

  it('keeps an empty 204 empty', async () => {
    const ctx = koaCtx();

    await writeFetchResponse(ctx, new Response(null, { status: 204 }));

    expect(ctx.status).toBe(204);
    expect(ctx.body).toBeNull();
  });

  it('keeps the Vary and exposed headers other middleware (CORS) already set', async () => {
    const ctx = koaCtx();
    ctx.set('Vary', 'Origin');
    ctx.set('Access-Control-Expose-Headers', 'x-total');

    await writeFetchResponse(
      ctx,
      new Response('{}', {
        headers: { vary: 'Accept-Encoding', 'access-control-expose-headers': 'set-auth-token' },
      })
    );

    expect(ctx.response.get('vary').split(/\s*,\s*/)).toEqual(['Origin', 'Accept-Encoding']);
    expect(ctx.response.get('access-control-expose-headers').split(/\s*,\s*/)).toEqual([
      'x-total',
      'set-auth-token',
    ]);
  });
});
