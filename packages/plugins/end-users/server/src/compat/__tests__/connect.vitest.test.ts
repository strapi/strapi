/**
 * What the connect routes rely on in Better Auth 1.7.14.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { betterAuth } from 'better-auth/minimal';
import { memoryAdapter } from 'better-auth/adapters/memory';
import type { Core } from '@strapi/types';

import { BUILT_IN_PROVIDERS } from '../../providers/built-in';
import providerService from '../../services/provider';
import { connectRedirectUri, frontendCallback, resolveFrontendCallback } from '../connect';

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

describe('a ?callback= written to get past the origin check', () => {
  const TRUSTED = 'https://trusted.example.com';
  let engine: { isTrustedOrigin: (origin: string) => Promise<boolean> };

  // The engine's own matcher, with the one origin trusted: what a browser would be sent to is
  // decided on the URL the parser makes of the string, so that is what is held to the rule
  beforeAll(async () => {
    const auth = betterAuth({
      database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
      secret: 'test-secret-at-least-32-characters-long',
      baseURL: 'https://api.example.com',
      trustedOrigins: [TRUSTED],
      telemetry: { enabled: false },
    });
    const context = (await auth.$context) as unknown as {
      isTrustedOrigin: (url: string) => boolean;
    };

    engine = { isTrustedOrigin: async (origin) => context.isTrustedOrigin(origin) };
  });

  const resolve = (value: string) =>
    resolveFrontendCallback(setup().strapi, engine, 'github', value);

  it.each([
    ['a protocol-relative URL', '//evil.example.net'],
    ['userinfo that names the trusted host', `https://trusted.example.com@evil.example.net/`],
    ['a backslash after the scheme', 'https:\\evil.example.net'],
    ['a slash and a backslash after the scheme', 'https:/\\evil.example.net'],
    ['a trailing dot on the host', 'https://trusted.example.com./done'],
    ['the right host on the wrong scheme', 'http://trusted.example.com/done'],
    ['a scheme with no slashes', 'http:trusted.example.com'],
    ['a javascript URL', ['javascript', 'alert(1)'].join(':')],
  ])('refuses %s', async (_name, value) => {
    await expect(resolve(value)).resolves.toBeNull();
  });

  it('gives back the parsed URL, which is the one a browser follows', async () => {
    await expect(resolve('HTTPS://TRUSTED.EXAMPLE.COM/Done?x=1')).resolves.toBe(
      `${TRUSTED}/Done?x=1`
    );
    // A backslash before the at sign ends the host: the parser reads the trusted host here
    await expect(resolve('https://trusted.example.com\\@evil.example.net')).resolves.toBe(
      `${TRUSTED}/@evil.example.net`
    );
  });

  it('never gives a URL whose origin is not the trusted one', async () => {
    for (const value of [
      '//evil.example.net',
      'https://evil.example.net',
      'https://trusted.example.com@evil.example.net',
      'https:\\evil.example.net',
      'https://trusted.example.com.evil.example.net',
      'https://TRUSTED.example.com./',
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const resolved = await resolve(value);

      expect(resolved === null || new URL(resolved).origin === TRUSTED, value).toBe(true);
    }
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
