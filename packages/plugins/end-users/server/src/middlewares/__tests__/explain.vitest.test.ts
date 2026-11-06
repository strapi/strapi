import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import type { ExplainEntry } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { koaCtx } from '../../engine/better-auth/__tests__/utils/koa-ctx';
import {
  createExplainMiddleware,
  EXPLAIN_HEADER,
  MAX_HEADER_BYTES,
  toHeaderValue,
} from '../explain';

const removed = (path = 'secret'): ExplainEntry => ({
  kind: 'field-removed',
  uid: 'api::note.note',
  action: 'find',
  path,
  roles: ['Authenticated'],
});

interface Setup {
  config?: Record<string, unknown>;
  explained?: { checked: boolean; entries: ExplainEntry[] };
  strategy?: string | null;
  routeType?: string | null;
  handler?: unknown;
  /** What core's route registration gives a route with a string handler */
  scope?: string[];
  url?: string;
  status?: number;
  body?: unknown;
  readExplain?: () => { checked: boolean; entries: ExplainEntry[] };
}

/** Runs the middleware around a route handler that answers `status` and `body` */
const run = async ({
  config = {},
  explained = { checked: true, entries: [removed()] },
  strategy = 'end-users',
  routeType = 'content-api',
  handler = 'api::note.note.find',
  scope,
  url = '/api/notes',
  status = 200,
  body = { data: [] },
  readExplain,
}: Setup = {}) => {
  const read = vi.fn(readExplain ?? (() => explained));
  const debug = vi.fn();
  const strapi = {
    config: { get: (path: string) => config[path] },
    contentAPI: { permissions: { readExplain: read } },
    log: { debug },
  } as unknown as Core.Strapi;
  const middleware = createExplainMiddleware(strapi) as Core.MiddlewareHandler;
  const ctx = koaCtx({ url });

  const next = vi.fn(async () => {
    // What core's route handler and the authentication leave in the state
    Object.assign(ctx.state, {
      ...(routeType === null
        ? {}
        : {
            route: {
              info: { type: routeType },
              handler,
              method: 'GET',
              path: '/api/notes',
              config: scope ? { auth: { scope } } : {},
            },
          }),
      ...(strategy === null ? {} : { auth: { strategy: { name: strategy }, ability: {} } }),
    });
    ctx.status = status;
    ctx.body = body;
  });

  await middleware(ctx, next);

  return { ctx, read, debug, next, header: ctx.response.get(EXPLAIN_HEADER) };
};

describe('explain middleware', () => {
  describe('when explain is on', () => {
    it.each([
      ['explain: true', { 'plugin::end-users.explain': true }],
      ['autoReload', { autoReload: true }],
    ])('sets the header with the entries (%s)', async (_name, config) => {
      const { header, read, ctx } = await run({ config });

      expect(JSON.parse(header)).toEqual([removed()]);
      expect(read).toHaveBeenCalledTimes(1);
      // The auth the strategy gave the request is what the checks recorded against
      expect(read).toHaveBeenCalledWith(ctx.state.auth);
    });

    it('sets the header after the route has answered', async () => {
      const { ctx, next } = await run({ config: { 'plugin::end-users.explain': true } });

      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.response.get(EXPLAIN_HEADER)).not.toBe('');
    });

    it('sets an empty list when the checks ran and changed nothing', async () => {
      const { header } = await run({
        config: { 'plugin::end-users.explain': true },
        explained: { checked: true, entries: [] },
      });

      expect(JSON.parse(header)).toEqual([]);
    });

    it('does not touch the body without ?explain=true', async () => {
      const { ctx } = await run({ config: { 'plugin::end-users.explain': true } });

      expect(ctx.body).toEqual({ data: [] });
    });

    it('adds meta.permissions to an object body with ?explain=true', async () => {
      const { ctx } = await run({
        config: { 'plugin::end-users.explain': true },
        url: '/api/notes?explain=true',
      });

      expect(ctx.body).toEqual({ data: [], meta: { permissions: [removed()] } });
    });

    it('keeps the meta the route sent', async () => {
      const { ctx } = await run({
        config: { 'plugin::end-users.explain': true },
        url: '/api/notes?explain=true',
        body: { data: [], meta: { pagination: { page: 1 } } },
      });

      expect(ctx.body).toEqual({
        data: [],
        meta: { pagination: { page: 1 }, permissions: [removed()] },
      });
    });

    it('does not add meta.permissions with ?explain=false', async () => {
      const { ctx } = await run({
        config: { 'plugin::end-users.explain': true },
        url: '/api/notes?explain=false',
      });

      expect(ctx.body).toEqual({ data: [] });
    });

    it.each([
      ['a list', [{ id: 1 }]],
      ['a stream', Readable.from(['x'])],
      ['a string', 'ok'],
      ['no body', null],
    ])('leaves %s as it is, header aside', async (_name, body) => {
      const { ctx, header } = await run({
        config: { 'plugin::end-users.explain': true },
        url: '/api/notes?explain=true',
        body,
        status: body === null ? 204 : 200,
      });

      expect(header).not.toBe('');
      expect(ctx.body).toEqual(body);
    });

    it('cuts what it adds to the header and says so, and still gives meta.permissions in full', async () => {
      const entries = Array.from({ length: 400 }, (_value, index) => removed(`field${index}`));
      const { header, ctx } = await run({
        config: { 'plugin::end-users.explain': true },
        url: '/api/notes?explain=true',
        explained: { checked: true, entries },
      });

      const sent = JSON.parse(header) as unknown[];

      expect(header.length).toBeLessThanOrEqual(MAX_HEADER_BYTES);
      expect(sent.at(-1)).toEqual({ truncated: true, omitted: expect.any(Number) });
      expect(sent.slice(0, -1)).toEqual(entries.slice(0, sent.length - 1));
      expect((sent.at(-1) as { omitted: number }).omitted + sent.length - 1).toBe(400);
      expect((ctx.body as { meta: { permissions: unknown[] } }).meta.permissions).toHaveLength(400);
    });
  });

  describe('a request that ran no check', () => {
    it('is route-only, named by the scope of its route', async () => {
      const { header } = await run({
        config: { 'plugin::end-users.explain': true },
        explained: { checked: false, entries: [] },
        handler: 'custom',
        scope: ['api::note.note.custom'],
      });

      expect(JSON.parse(header)).toEqual([{ kind: 'route-only', route: 'api::note.note.custom' }]);
    });

    it('is named by its handler when the route has no scope', async () => {
      const { header } = await run({
        config: { 'plugin::end-users.explain': true },
        explained: { checked: false, entries: [] },
        handler: 'api::note.note.custom',
      });

      expect(JSON.parse(header)).toEqual([{ kind: 'route-only', route: 'api::note.note.custom' }]);
    });

    it('is named by its method and path when the handler is a function', async () => {
      const { header } = await run({
        config: { 'plugin::end-users.explain': true },
        explained: { checked: false, entries: [] },
        handler() {},
      });

      expect(JSON.parse(header)).toEqual([{ kind: 'route-only', route: 'GET /api/notes' }]);
    });

    it.each([401, 403, 404])('is not route-only when the route answered %i', async (status) => {
      const { header } = await run({
        config: { 'plugin::end-users.explain': true },
        explained: { checked: false, entries: [] },
        status,
      });

      expect(JSON.parse(header)).toEqual([]);
    });

    it('goes to the debug log when explain is off', async () => {
      const { debug, header } = await run({
        explained: { checked: false, entries: [] },
        handler: 'api::note.note.custom',
      });

      expect(header).toBe('');
      expect(debug).toHaveBeenCalledWith(expect.stringContaining('"kind":"route-only"'));
    });
  });

  describe('when explain is off (production)', () => {
    it('adds nothing to the response and logs the entries at debug level', async () => {
      const { ctx, header, debug } = await run({ url: '/api/notes?explain=true' });

      expect(header).toBe('');
      expect(ctx.body).toEqual({ data: [] });
      expect(debug).toHaveBeenCalledTimes(1);
      expect(debug).toHaveBeenCalledWith(expect.stringContaining('GET /api/notes'));
      expect(debug).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify([removed()])));
    });

    it('logs nothing when there is nothing to say', async () => {
      const { debug } = await run({ explained: { checked: true, entries: [] } });

      expect(debug).not.toHaveBeenCalled();
    });
  });

  describe('which requests it explains', () => {
    it.each([
      ['an API token', { strategy: 'api-token' }],
      ['users-permissions', { strategy: 'users-permissions' }],
      ['no authentication', { strategy: null }],
      ['an admin or other route', { routeType: 'admin' }],
      ['a request that reached no route', { routeType: null }],
    ])('never explains %s', async (_name, setup) => {
      const { header, read, debug } = await run({
        config: { 'plugin::end-users.explain': true, autoReload: true },
        url: '/api/notes?explain=true',
        ...setup,
      });

      expect(header).toBe('');
      expect(read).not.toHaveBeenCalled();
      expect(debug).not.toHaveBeenCalled();
    });
  });

  it('never changes the response when explaining fails', async () => {
    const { ctx, header, debug } = await run({
      config: { 'plugin::end-users.explain': true },
      url: '/api/notes?explain=true',
      readExplain() {
        throw new Error('boom');
      },
    });

    expect(header).toBe('');
    expect(ctx.body).toEqual({ data: [] });
    expect(ctx.status).toBe(200);
    expect(debug).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('lets an error of the request through untouched', async () => {
    const strapi = {
      config: {
        get() {
          return true;
        },
      },
      contentAPI: { permissions: { readExplain: vi.fn() } },
      log: { debug: vi.fn() },
    } as unknown as Core.Strapi;
    const middleware = createExplainMiddleware(strapi) as Core.MiddlewareHandler;

    await expect(
      middleware(koaCtx(), async () => {
        throw new Error('handler failed');
      })
    ).rejects.toThrow('handler failed');
  });
});

describe('toHeaderValue', () => {
  it('is the JSON of the entries when it fits', () => {
    expect(JSON.parse(toHeaderValue([removed('a'), removed('b')]))).toEqual([
      removed('a'),
      removed('b'),
    ]);
    expect(toHeaderValue([])).toBe('[]');
  });

  it('escapes what a header can not carry, so it stays one valid line of JSON', () => {
    const value = toHeaderValue([removed('titreé\n中')]);

    expect(value).toMatch(/^[\x20-\x7e]*$/);
    expect(JSON.parse(value)).toEqual([removed('titreé\n中')]);
  });

  it('keeps the entries that fit, in order, and ends with the marker', () => {
    const entries = Array.from({ length: 50 }, (_value, index) => removed(`field${index}`));
    const value = toHeaderValue(entries, 1000);
    const parsed = JSON.parse(value) as unknown[];

    expect(value.length).toBeLessThanOrEqual(1000);
    expect(parsed.length).toBeGreaterThan(2);
    expect(parsed.slice(0, -1)).toEqual(entries.slice(0, parsed.length - 1));
    expect(parsed.at(-1)).toEqual({ truncated: true, omitted: 50 - (parsed.length - 1) });
  });

  it('says every entry was omitted when not one fits', () => {
    const value = toHeaderValue([removed('x'.repeat(2000))], 200);

    expect(JSON.parse(value)).toEqual([{ truncated: true, omitted: 1 }]);
    expect(value.length).toBeLessThanOrEqual(200);
  });

  it('uses 8 KB as the default', () => {
    expect(MAX_HEADER_BYTES).toBe(8192);
  });
});
