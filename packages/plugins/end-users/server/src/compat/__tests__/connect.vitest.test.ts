/**
 * What the connect routes rely on in Better Auth 1.7.14, read from its source:
 */
import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { BUILT_IN_PROVIDERS } from '../../providers/built-in';
import providerService from '../../services/provider';
import { connectRedirectUri, frontendCallback, resolveFrontendCallback } from '../connect';

// The sign-in's state is a row in the `verification` table plus a signed `state` cookie, so it
// survives the forward from the connect callback: the browser sends the cookie back to the same
// host, and the route hands the request's cookies on.
it.todo('keeps the OAuth state in a verification row and a signed cookie the browser sends back');
// `redirectURI` in a provider's own options is what the authorize URL and the token request
// carry, ahead of the `/callback/<id>` address Better Auth derives.
it.todo('sends the provider options.redirectURI to the authorize and the token endpoints');
// Generic OAuth providers sign in through `POST /sign-in/social` like the built-in ones, and the
// callback is `GET /callback/:id` with the same query.
it.todo('starts every provider at POST /sign-in/social and finishes it at GET /callback/:id');
// A failure is a redirect to the errorCallbackURL of the sign-in, with `?error=`.
it.todo('redirects an OAuth failure to the errorCallbackURL with ?error=');

vi.mock('../../providers/registry', () => ({
  registry() {
    const github = BUILT_IN_PROVIDERS.find((definition) => definition.id === 'github');

    return {
      available: () => [github],
      fromConfig: () => [],
      get: () => github,
      packageOf: () => null,
    };
  },
}));

const FRONT_END = 'https://app.example.com';

const setup = (settings: { compat?: boolean; callbacks?: Record<string, string> } = {}) => {
  const config: Record<string, unknown> = {
    'server.url': 'https://api.example.com',
    'api.rest.prefix': '/api',
    'plugin::end-users.compat.usersPermissions': settings.compat ?? true,
    'plugin::end-users.compat.connect.callbacks': settings.callbacks ?? {},
  };
  const stored = new Map<string, unknown>([
    ['providers', { github: { enabled: true, clientId: 'id', clientSecret: 'x' } }],
  ]);

  return {
    config,
    strapi: {
      log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
      config: { get: (key: string) => config[key] },
      store: () => ({ get: async ({ key }: { key: string }) => stored.get(key) ?? null }),
      service: () => ({ encrypt: (v: string) => v, decrypt: (v: string) => v }),
      plugin: () => ({ service: () => ({ reload: async () => undefined }) }),
    } as unknown as Core.Strapi,
  };
};

const trusting = (...origins: string[]) => ({
  isTrustedOrigin: vi.fn(async (origin: string) => origins.includes(origin)),
});

describe('frontendCallback', () => {
  it('resolves the front-end URL from ?callback=, then the configured map, then the API default', () => {
    const { strapi } = setup({ callbacks: { github: `${FRONT_END}/configured` } });

    expect(frontendCallback(strapi, 'github', `${FRONT_END}/asked`)).toBe(`${FRONT_END}/asked`);
    expect(frontendCallback(strapi, 'github', undefined)).toBe(`${FRONT_END}/configured`);
    expect(frontendCallback(strapi, 'google', undefined)).toBe(
      'https://api.example.com/api/auth/google/callback'
    );
  });

  it('is null for a ?callback= or a configured value that is not an absolute http(s) URL', () => {
    const { strapi } = setup({ callbacks: { github: 'file:///etc/passwd' } });

    expect(frontendCallback(strapi, 'google', '/relative')).toBeNull();
    expect(frontendCallback(strapi, 'google', 'ftp://app.example.com')).toBeNull();
    expect(frontendCallback(strapi, 'github', undefined)).toBeNull();
  });

  it("refuses a ?callback= whose origin is neither trusted nor the server's", async () => {
    const { strapi } = setup();
    const engine = trusting(FRONT_END);

    await expect(
      resolveFrontendCallback(strapi, engine, 'github', `${FRONT_END}/done`)
    ).resolves.toBe(`${FRONT_END}/done`);
    await expect(
      resolveFrontendCallback(strapi, engine, 'github', 'https://evil.example.net/done')
    ).resolves.toBeNull();
    expect(engine.isTrustedOrigin).toHaveBeenLastCalledWith('https://evil.example.net');
  });

  it('does not ask the engine about a configured or default address', async () => {
    const { strapi } = setup({ callbacks: { github: `${FRONT_END}/configured` } });
    const engine = trusting();

    await expect(resolveFrontendCallback(strapi, engine, 'github', undefined)).resolves.toBe(
      `${FRONT_END}/configured`
    );
    expect(engine.isTrustedOrigin).not.toHaveBeenCalled();
  });
});

describe('the redirect URI', () => {
  it('sets redirectURI to the connect callback only with compat on', async () => {
    const on = await providerService({ strapi: setup().strapi }).options();
    const off = await providerService({ strapi: setup({ compat: false }).strapi }).options();

    expect(on.socialProviders.github).toMatchObject({
      redirectURI: 'https://api.example.com/api/connect/github/callback',
    });
    expect(off.socialProviders.github).not.toHaveProperty('redirectURI');
  });

  it("shows that URL as the provider's redirect URI", async () => {
    const on = await providerService({ strapi: setup().strapi }).list();
    const off = await providerService({ strapi: setup({ compat: false }).strapi }).list();

    expect(on[0].redirectUri).toBe('https://api.example.com/api/connect/github/callback');
    expect(off[0].redirectUri).toBe('https://api.example.com/api/auth/callback/github');
    expect(connectRedirectUri(setup().strapi, 'github')).toBe(on[0].redirectUri);
  });
});
