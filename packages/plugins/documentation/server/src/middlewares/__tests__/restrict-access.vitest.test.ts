import { get } from 'lodash';
import type Koa from 'koa';
import { describe, expect, test, vi, type Mock } from 'vitest';

import restrictAccess from '../restrict-access';

const SERVER_URL = 'http://localhost:1337';

/**
 * Mirrors the config provider: the startup copy as own keys, plus `get` over the live tree.
 */
const createConfig = (values: Record<string, unknown>) => ({
  ...values,
  get: (key: string, defaultValue?: unknown) => get(values, key, defaultValue),
});

const createStrapi = (storedConfig: Record<string, unknown>) => ({
  config: createConfig({ server: { url: SERVER_URL } }),
  store: vi.fn(() => ({ get: vi.fn(async () => storedConfig) })),
});

const createContext = ({
  session,
  querystring = '',
}: {
  session?: Record<string, unknown>;
  querystring?: string;
}) => ({ session, querystring, redirect: vi.fn() }) as unknown as Koa.Context & { redirect: Mock };

describe('Documentation plugin | restrict-access middleware', () => {
  test('calls next when access is not restricted', async () => {
    global.strapi = createStrapi({ restrictedAccess: false }) as any;
    const ctx = createContext({});
    const next = vi.fn();

    await restrictAccess(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(ctx.redirect).not.toHaveBeenCalled();
  });

  test('redirects to the login page on the server URL, keeping the query string', async () => {
    global.strapi = createStrapi({ restrictedAccess: true }) as any;
    const ctx = createContext({ querystring: 'foo=bar' });
    const next = vi.fn();

    await restrictAccess(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(ctx.redirect).toHaveBeenCalledWith(`${SERVER_URL}/documentation/login?foo=bar`);
  });

  test('calls next when the session is logged in', async () => {
    global.strapi = createStrapi({ restrictedAccess: true }) as any;
    const ctx = createContext({ session: { documentation: { logged: true } } });
    const next = vi.fn();

    await restrictAccess(ctx, next);

    expect(next).toHaveBeenCalled();
  });
});
