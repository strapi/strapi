'use strict';

const crypto = require('crypto');

const { errors } = require('@strapi/utils');

const { jwkToKeyObject, verifyJwtWithJwks } = require('../verify-jwt-with-jwks');
const oauthProviders = require('../oauth-connect/providers');
const oauth1 = require('../oauth-connect/oauth1');
const oauth2 = require('../oauth-connect/oauth2');
const {
  redirectWithPayload,
  buildProviderConfig,
  createOAuthConnectMiddleware,
} = require('../oauth-connect');

const mockProvidersService = () => {
  jest.spyOn(require('..'), 'getService').mockImplementation((name) => {
    if (name === 'providers') {
      return {
        buildRedirectUri: (providerName) =>
          `http://localhost:1337/api/connect/${providerName}/callback`,
      };
    }
    return {};
  });
};

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
    const ctx = { redirect: jest.fn() };
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

  const setStrapi = (overrides = {}) => {
    global.strapi = {
      plugins: {},
      apis: {},
      admin: { services: {} },
      config: { get: () => '/api' },
      ...overrides,
    };
  };

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('throws ApplicationError (not TypeError) when provider is disabled', async () => {
    setStrapi({
      store: () => ({
        get: async () => ({
          google: { enabled: false, key: 'k', secret: 's', callback: 'http://localhost/cb' },
        }),
      }),
    });

    const mw = createOAuthConnectMiddleware();
    const ctx = {
      request: { url: '/api/connect/google' },
      session: {},
      state: {},
      redirect: jest.fn(),
    };

    await expect(mw(ctx, jest.fn())).rejects.toBeInstanceOf(errors.ApplicationError);
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
    mockProvidersService();
    global.fetch = jest.fn();

    const mw = createOAuthConnectMiddleware();
    const ctx = {
      request: { url: '/api/connect/google/callback?code=abc&state=attacker' },
      query: { code: 'abc', state: 'attacker' },
      session: { grant: {} },
      state: {},
      redirect: jest.fn(),
    };

    await mw(ctx, jest.fn());

    expect(global.fetch).not.toHaveBeenCalled();
    expect(ctx.redirect).toHaveBeenCalledWith(expect.stringContaining('error=oauth_error'));
  });

  test('awaits callback handler so token-exchange failures redirect with oauth_error', async () => {
    jest.spyOn(oauth2, 'exchangeAuthorizationCode').mockRejectedValue(new Error('boom'));

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
    mockProvidersService();

    const mw = createOAuthConnectMiddleware();
    const ctx = {
      request: { url: '/api/connect/google/callback?code=abc&state=good' },
      query: { code: 'abc', state: 'good' },
      session: { grant: { state: 'good' } },
      state: {},
      redirect: jest.fn(),
    };

    await expect(mw(ctx, jest.fn())).resolves.toBeUndefined();
    expect(ctx.redirect).toHaveBeenCalledWith(expect.stringContaining('error=oauth_error'));
    expect(ctx.redirect).toHaveBeenCalledWith(expect.stringContaining('error_description=boom'));
  });

  test('preserves dynamic callback from session on callback leg', async () => {
    jest.spyOn(oauth2, 'exchangeAuthorizationCode').mockResolvedValue({
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
    mockProvidersService();

    const mw = createOAuthConnectMiddleware();
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
      redirect: jest.fn(),
    };

    await mw(ctx, jest.fn());

    expect(ctx.redirect).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:3000/custom-cb')
    );
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
    mockProvidersService();

    const mw = createOAuthConnectMiddleware();
    const ctx = {
      request: { url: '/api/connect/google' },
      query: {},
      session: {
        grant: {
          dynamic: { callback: 'http://localhost:3000/custom-cb' },
        },
      },
      state: { oauthConnect: { callback: 'http://localhost:3000/custom-cb' } },
      redirect: jest.fn(),
    };

    await mw(ctx, jest.fn());

    expect(ctx.session.grant.dynamic).toEqual({
      callback: 'http://localhost:3000/custom-cb',
    });
    expect(ctx.session.grant.state).toBeDefined();
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
