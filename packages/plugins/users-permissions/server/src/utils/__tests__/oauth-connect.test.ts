import type { Core } from '@strapi/types';
import { afterEach, describe, expect, test, vi } from 'vitest';

import crypto from 'crypto';

import { errors } from '@strapi/utils';
import { createContextMock, createStrapiMock } from '../../../tests/utils';

import { jwkToKeyObject, verifyJwtWithJwks } from '../verify-jwt-with-jwks';
import oauthProviders from '../oauth-connect/providers';
import * as oauth1 from '../oauth-connect/oauth1';
import * as oauth2 from '../oauth-connect/oauth2';
import {
  redirectWithPayload,
  buildProviderConfig,
  createOAuthConnectMiddleware,
} from '../oauth-connect';

describe('verify-jwt-with-jwks', () => {
  test('jwkToKeyObject converts RSA JWK to verifyable key', () => {
    const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' });
    const keyObject = jwkToKeyObject(jwk);
    expect(keyObject.asymmetricKeyType).toBe('rsa');
  });
});

describe('oauth-connect helpers', () => {
  test('buildProviderConfig merges stored settings with defaults', () => {
    const config = buildProviderConfig(
      'google',
      {
        key: 'client-id',
        secret: 'client-secret',
        scope: ['email'],
        callback: 'http://localhost:3000/auth/google/callback',
      },
      'http://localhost:1337/api/connect/google/callback'
    );

    expect(config).toMatchObject({
      name: 'google',
      oauth: 2,
      key: 'client-id',
      redirect_uri: 'http://localhost:1337/api/connect/google/callback',
    });
  });

  test('buildProviderConfig falls back to store-defined endpoints for custom providers', () => {
    const config = buildProviderConfig(
      'my-custom-idp',
      {
        enabled: true,
        oauth: 2,
        authorize_url: 'https://idp.example.com/authorize',
        access_url: 'https://idp.example.com/token',
        scope_delimiter: ' ',
        key: 'custom-key',
        secret: 'custom-secret',
        scope: ['openid'],
        callback: 'http://localhost:3000/auth/custom/callback',
      },
      'http://localhost:1337/api/connect/my-custom-idp/callback'
    );

    expect(config).toMatchObject({
      name: 'my-custom-idp',
      oauth: 2,
      authorize_url: 'https://idp.example.com/authorize',
      access_url: 'https://idp.example.com/token',
      key: 'custom-key',
    });
  });

  test('buildProviderConfig returns null when custom provider lacks endpoints', () => {
    expect(
      buildProviderConfig(
        'broken-custom',
        { enabled: true, key: 'k', secret: 's', callback: 'http://localhost/cb' },
        'http://localhost:1337/api/connect/broken-custom/callback'
      )
    ).toBeNull();
  });

  test('redirectWithPayload serializes token response for frontend callback', () => {
    const ctx = { redirect: vi.fn() };
    redirectWithPayload(ctx, 'http://localhost:3000/callback', {
      access_token: 'abc',
      raw: { access_token: 'abc', token_type: 'bearer' },
    });

    expect(ctx.redirect).toHaveBeenCalledWith(expect.stringContaining('access_token=abc'));
    expect(ctx.redirect).toHaveBeenCalledWith(expect.stringContaining('raw%5Baccess_token%5D=abc'));
  });

  test('oauth2.buildAuthorizeUrl supports subdomain providers', () => {
    const url = oauth2.buildAuthorizeUrl(
      { ...oauthProviders.cognito, name: 'cognito' },
      {
        key: 'id',
        redirectUri: 'http://localhost:1337/api/connect/cognito/callback',
        scope: ['openid', 'email'],
        subdomain: 'auth.example.com',
      }
    );

    expect(url).toContain('https://auth.example.com/oauth2/authorize');
    expect(url).toContain('client_id=id');
  });
});

describe('oauth1 signature base string', () => {
  test('signs query params via params, not in the base-string URI', () => {
    const withParams = oauth1.buildOAuth1Header({
      method: 'GET',
      url: 'https://api.twitter.com/1.1/account/verify_credentials.json',
      params: { include_email: 'true' },
      consumerKey: 'ck',
      clientCredential: 'cs',
      token: 'tok',
      tokenCredential: 'toks',
    });

    const withQueryInUrl = oauth1.buildOAuth1Header({
      method: 'GET',
      url: 'https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true',
      params: {},
      consumerKey: 'ck',
      clientCredential: 'cs',
      token: 'tok',
      tokenCredential: 'toks',
    });

    expect(withParams).toContain('include_email');
    expect(withQueryInUrl).not.toContain('include_email');
  });
});

describe('createOAuthConnectMiddleware', () => {
  const originalFetch = global.fetch;

  let strapi: Core.Strapi;
  const setStrapi = (overrides: Record<string, unknown> = {}) => {
    strapi = createStrapiMock({
      plugin: () => ({
        service: () => ({
          buildRedirectUri: (providerName: string) =>
            `http://localhost:1337/api/connect/${providerName}/callback`,
        }),
      }),
      plugins: {},
      apis: {},
      admin: { services: {} },
      config: { get: () => '/api' },
      ...overrides,
    });
  };

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('throws ApplicationError (not TypeError) when provider is disabled', async () => {
    setStrapi({
      store: () => ({
        get: async () => ({
          google: { enabled: false, key: 'k', secret: 's', callback: 'http://localhost/cb' },
        }),
      }),
    });

    const mw = createOAuthConnectMiddleware(strapi);
    const ctx = {
      request: { url: '/api/connect/google' },
      session: {},
      state: {},
      redirect: vi.fn(),
    };

    await expect(mw(createContextMock(ctx), vi.fn())).rejects.toBeInstanceOf(
      errors.ApplicationError
    );
  });

  test('rejects OAuth2 callback when session state is missing', async () => {
    setStrapi({
      store: () => ({
        get: async () => ({
          google: {
            enabled: true,
            key: 'k',
            secret: 's',
            callback: 'http://localhost:3000/cb',
            scope: ['email'],
          },
        }),
      }),
    });
    global.fetch = vi.fn();

    const mw = createOAuthConnectMiddleware(strapi);
    const ctx = {
      request: { url: '/api/connect/google/callback?code=abc&state=attacker' },
      query: { code: 'abc', state: 'attacker' },
      session: { grant: {} },
      state: {},
      redirect: vi.fn(),
    };

    await mw(createContextMock(ctx), vi.fn());

    expect(global.fetch).not.toHaveBeenCalled();
    expect(ctx.redirect).toHaveBeenCalledWith(expect.stringContaining('error=oauth_error'));
  });

  test('awaits callback handler so token-exchange failures redirect with oauth_error', async () => {
    vi.spyOn(oauth2, 'exchangeAuthorizationCode').mockRejectedValue(new Error('boom'));

    setStrapi({
      store: () => ({
        get: async () => ({
          google: {
            enabled: true,
            key: 'k',
            secret: 's',
            callback: 'http://localhost:3000/cb',
            scope: ['email'],
          },
        }),
      }),
    });

    const mw = createOAuthConnectMiddleware(strapi);
    const ctx = {
      request: { url: '/api/connect/google/callback?code=abc&state=good' },
      query: { code: 'abc', state: 'good' },
      session: { grant: { state: 'good' } },
      state: {},
      redirect: vi.fn(),
    };

    await expect(mw(createContextMock(ctx), vi.fn())).resolves.toBeUndefined();
    expect(ctx.redirect).toHaveBeenCalledWith(expect.stringContaining('error=oauth_error'));
    expect(ctx.redirect).toHaveBeenCalledWith(expect.stringContaining('error_description=boom'));
  });

  test('preserves dynamic callback from session on callback leg', async () => {
    vi.spyOn(oauth2, 'exchangeAuthorizationCode').mockResolvedValue({
      access_token: 'tok',
      token_type: 'bearer',
    });

    setStrapi({
      store: () => ({
        get: async () => ({
          google: {
            enabled: true,
            key: 'k',
            secret: 's',
            callback: 'http://localhost:3000/default-cb',
            scope: ['email'],
          },
        }),
      }),
    });

    const mw = createOAuthConnectMiddleware(strapi);
    const ctx = {
      request: { url: '/api/connect/google/callback?code=abc&state=good' },
      query: { code: 'abc', state: 'good' },
      session: {
        grant: {
          state: 'good',
          dynamic: { callback: 'http://localhost:3000/custom-cb' },
        },
      },
      state: {},
      redirect: vi.fn(),
    };

    await mw(createContextMock(ctx), vi.fn());

    expect(ctx.redirect).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:3000/custom-cb')
    );
    expect(ctx.redirect).not.toHaveBeenCalledWith(expect.stringContaining('access_token'));
    expect(ctx.session.grant).toEqual({ response: { access_token: 'tok' } });
  });

  test('keeps only the provider-specific token fields in the server session', async () => {
    const idToken = `header.${'x'.repeat(1800)}.signature`;
    vi.spyOn(oauth2, 'exchangeAuthorizationCode').mockResolvedValue({
      id_token: idToken,
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'bearer',
    });

    setStrapi({
      store: () => ({
        get: async () => ({
          cognito: {
            enabled: true,
            key: 'k',
            secret: 's',
            subdomain: 'auth.example.com',
            callback: 'http://localhost:3000/cb',
            scope: ['openid', 'email'],
          },
        }),
      }),
    });

    const mw = createOAuthConnectMiddleware(strapi);
    const ctx = {
      request: { url: '/api/connect/cognito/callback?code=abc&state=good' },
      query: { code: 'abc', state: 'good' },
      session: { grant: { state: 'good' } },
      state: {},
      redirect: vi.fn(),
    };

    await mw(createContextMock(ctx), vi.fn());

    expect(ctx.session.grant).toEqual({ response: { id_token: idToken } });
    expect(ctx.redirect).toHaveBeenCalledWith('http://localhost:3000/cb');
  });

  test('start leg keeps dynamic callback in session across grant rewrite', async () => {
    setStrapi({
      store: () => ({
        get: async () => ({
          google: {
            enabled: true,
            key: 'k',
            secret: 's',
            callback: 'http://localhost:3000/default-cb',
            scope: ['email'],
          },
        }),
      }),
    });

    const mw = createOAuthConnectMiddleware(strapi);
    const ctx = {
      request: { url: '/api/connect/google' },
      query: {},
      session: {
        grant: {
          state: undefined as string | undefined,
          dynamic: { callback: 'http://localhost:3000/custom-cb' },
        },
      },
      state: { oauthConnect: { callback: 'http://localhost:3000/custom-cb' } },
      redirect: vi.fn(),
    };

    await mw(createContextMock(ctx), vi.fn());

    expect(ctx.session.grant.dynamic).toEqual({
      callback: 'http://localhost:3000/custom-cb',
    });
    expect(createContextMock(ctx).session.grant.state).toBeDefined();
    expect(ctx.redirect).toHaveBeenCalled();
  });
});

describe('verifyJwtWithJwks', () => {
  test('rejects malformed tokens', async () => {
    await expect(
      verifyJwtWithJwks({
        idToken: 'not-a-jwt',
        jwksUrl: new URL('https://example.com/.well-known/jwks.json'),
      })
    ).rejects.toThrow('The provided token is not valid');
  });
});
