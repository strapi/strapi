/* eslint @typescript-eslint/no-var-requires: off */
import { afterEach, describe, expect, it, vi } from 'vitest';

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { bearerGet, fetchJson } = require('../provider-http');
const { verifyJwtWithJwks } = require('../verify-jwt-with-jwks');
const { exchangeAuthorizationCode } = require('../oauth-connect/oauth2');
const { requestToken, twitterGet } = require('../oauth-connect/oauth1');

afterEach(() => vi.unstubAllGlobals());

describe('provider HTTP requests', () => {
  it.each([
    [
      new Response('{"email":"joe@example.com"}', { headers: { 'content-type': 'text/plain' } }),
      { email: 'joe@example.com' },
    ],
    [new Response('plain response'), 'plain response'],
  ])('reads successful non-JSON responses', async (response, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(fetchJson('https://provider.test')).resolves.toEqual({ body: expected });
  });
  it.each([
    ['{"error_description":"denied"}', 'application/json', 'denied'],
    ['{"message":"not found"}', 'application/json', 'not found'],
    ['unavailable', 'text/plain', 'unavailable'],
    ['', 'text/plain', 'HTTP 503'],
  ])('reports provider failures %s', async (body, contentType, message) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(body, { status: 503, headers: { 'content-type': contentType } })
        )
    );
    await expect(fetchJson('https://provider.test')).rejects.toThrow(message);
  });
  it('encodes query values and excludes missing values from bearer requests', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await bearerGet('https://provider.test/me', 'token', {
      qs: { email: 'joe+a@example.com', absent: undefined },
      headers: { 'Client-Id': 'id' },
    });
    const [url, options] = fetch.mock.calls[0];
    expect(url.searchParams.get('email')).toBe('joe+a@example.com');
    expect(url.searchParams.has('absent')).toBe(false);
    expect(options.headers).toEqual({ Authorization: 'Bearer token', 'Client-Id': 'id' });
  });
  it('uses basic authentication for the token endpoint without putting credentials in the body', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('access_token=token&token_type=bearer'));
    vi.stubGlobal('fetch', fetch);
    await expect(
      exchangeAuthorizationCode(
        {
          name: 'reddit',
          access_url: 'https://provider.test/token',
          token_endpoint_auth_method: 'client_secret_basic',
        },
        {
          key: 'client',
          secret: 'secret',
          redirectUri: 'https://site.test/callback',
          code: 'code',
        }
      )
    ).resolves.toEqual({ access_token: 'token', token_type: 'bearer' });
    const [, request] = fetch.mock.calls[0];
    expect(request.headers.Authorization).toBe(
      `Basic ${Buffer.from('client:secret').toString('base64')}`
    );
    expect(request.body.has('client_secret')).toBe(false);
    expect(request.body.has('client_id')).toBe(false);
  });
  it('surfaces OAuth token exchange and Twitter errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('denied', { status: 401 })));
    await expect(
      requestToken({
        requestUrl: 'https://provider.test/token',
        redirectUri: 'https://site.test/callback',
        consumerKey: 'key',
        clientCredential: 'secret',
      })
    ).rejects.toThrow('denied');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"errors":[{"message":"expired"}]}', { status: 401 }))
    );
    await expect(
      twitterGet({
        url: 'https://provider.test/me',
        accessToken: 'token',
        accessCredential: 'secret',
        consumerKey: 'key',
        clientCredential: 'secret',
      })
    ).rejects.toThrow('expired');
  });
});

describe('JWKS verification', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const idToken = jwt.sign({ email: 'joe@example.com' }, privateKey, {
    algorithm: 'RS256',
    keyid: 'key-1',
  });
  const jwksUrl = new URL('https://provider.test/.well-known/jwks.json');
  it('verifies a signed token against its matching remote key', async () => {
    const key = { ...publicKey.export({ format: 'jwk' }), kid: 'key-1' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ keys: [key] })));
    await expect(verifyJwtWithJwks({ idToken, jwksUrl })).resolves.toMatchObject({
      email: 'joe@example.com',
    });
  });
  it.each([new Response('', { status: 503 }), Response.json({ keys: [] })])(
    'rejects unavailable or unmatched keys',
    async (response) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
      await expect(verifyJwtWithJwks({ idToken, jwksUrl })).rejects.toThrow(
        'There was an error verifying the token'
      );
    }
  );
  it('rejects an invalid signature even when the key id matches', async () => {
    const otherKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey;
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ keys: [{ ...otherKey.export({ format: 'jwk' }), kid: 'key-1' }] })
        )
    );
    await expect(verifyJwtWithJwks({ idToken, jwksUrl })).rejects.toThrow(
      'There was an error verifying the token'
    );
  });
});
