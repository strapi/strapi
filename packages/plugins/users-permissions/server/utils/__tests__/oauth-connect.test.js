'use strict';

const crypto = require('crypto');

const { jwkToKeyObject, verifyJwtWithJwks } = require('../verify-jwt-with-jwks');
const oauthProviders = require('../oauth-connect/providers');
const oauth2 = require('../oauth-connect/oauth2');
const { redirectWithPayload, buildProviderConfig } = require('../oauth-connect');

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
