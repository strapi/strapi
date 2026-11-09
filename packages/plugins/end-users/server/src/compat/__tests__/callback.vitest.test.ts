import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { callback } from '../endpoints/callback';
import { readCompatConfig } from '../config';

vi.mock('../login-response', () => ({
  loginBody: (_cfg: unknown, { token, user }: { token: string; user: unknown }) => ({
    jwt: token,
    user,
  }),
  signedInUser: async () => ({ id: 1, email: 'ann@example.com' }),
}));

const NO_SESSION = 'OAuth authentication requires a completed provider session';

const setup = (
  overrides: {
    createdAt?: Date;
    impersonatedBy?: string | null;
    providers?: string[];
    claim?: boolean;
    enabled?: boolean;
  } = {}
) => {
  const engine = {
    getSession: vi.fn(async () => ({
      id: 's1',
      userId: 'doc1',
      createdAt: overrides.createdAt ?? new Date(),
      impersonatedBy: overrides.impersonatedBy ?? null,
    })),
    listAccounts: vi.fn(async () =>
      (overrides.providers ?? ['github']).map((providerId) => ({ providerId }))
    ),
    claimProviderSession: vi.fn(async () => overrides.claim ?? true),
  };
  const services = {
    engine: { get: () => engine },
    provider: { list: async () => [{ id: 'github', enabled: overrides.enabled ?? true }] },
  };
  const strapi = {
    config: { get: () => undefined },
    plugin: () => ({ service: (name: keyof typeof services) => services[name] }),
  } as unknown as Core.Strapi;
  const cfg = readCompatConfig(strapi);

  return { engine, strapi, cfg };
};

const run = ({ strapi, cfg }: ReturnType<typeof setup>, headers = new Headers()) =>
  callback(strapi, cfg, { provider: 'github', headers, token: 'signed-token' });

describe('the OAuth callback exchange', () => {
  it('answers for a session this provider just made, once, and tells caches not to keep it', async () => {
    const ctx = setup();
    const result = await run(ctx);

    expect(result).toMatchObject({
      status: 200,
      body: { jwt: 'signed-token' },
      headers: { 'cache-control': 'no-store' },
    });
    expect(ctx.engine.claimProviderSession).toHaveBeenCalledWith('s1', 'github');
  });

  it.each([
    ['a session older than five minutes', { createdAt: new Date(Date.now() - 6 * 60_000) }],
    ['a session of a user with no account for the provider', { providers: ['google'] }],
    ['an impersonated session', { impersonatedBy: 'admin-1' }],
    ['a session whose record was spent', { claim: false }],
  ])('refuses %s', async (_name, overrides) => {
    const result = await run(setup(overrides));

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: { message: NO_SESSION } });
  });

  it('spends the record only after the other conditions hold', async () => {
    const ctx = setup({ providers: ['google'] });

    await run(ctx);

    expect(ctx.engine.claimProviderSession).not.toHaveBeenCalled();
  });

  it('reads the session from the cookie alone, not from a Bearer header', async () => {
    const ctx = setup();

    await run(ctx, new Headers({ authorization: 'Bearer other', cookie: 'a=b' }));

    const asked = ctx.engine.getSession.mock.calls[0][0];

    expect(asked.get('authorization')).toBeNull();
    expect(asked.get('cookie')).toBe('a=b');
  });

  it('refuses a provider that is disabled', async () => {
    const result = await run(setup({ enabled: false }));

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: { message: 'This provider is disabled' } });
  });
});
