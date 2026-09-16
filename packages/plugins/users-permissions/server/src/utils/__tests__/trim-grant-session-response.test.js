'use strict';

/* eslint-env jest */
/* eslint-disable import/no-extraneous-dependencies */

const cookie = require('cookie');
const signature = require('cookie-signature');

const { trimGrantSessionResponse } = require('../trim-grant-session-response');
const { tokensToQueryPayload } = require('../oauth-connect/oauth2');

const BROWSER_COOKIE_LIMIT = 4096;
const SESSION_COOKIE_NAME = 'koa.sess';
const SESSION_COOKIE_SECRET = 'trim-grant-session-response-test-secret';
const GRANT_PROVIDER_KEY = 'cognito-test-client';

const toBase64Url = (value) =>
  Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const makeJwt = (payloadPadding = 0, audience = GRANT_PROVIDER_KEY) => {
  const header = toBase64Url({ alg: 'RS256', typ: 'JWT', kid: 'test' });
  const payload = toBase64Url({
    sub: 'user-1',
    aud: audience,
    email: `user@${'x'.repeat(payloadPadding)}example.com`,
  });
  const signature = toBase64Url({ sig: 'test' });

  return `${header}.${payload}.${signature}`;
};

const estimateSignedSessionCookieBytes = (sessionPayload) => {
  const signed = signature.sign(
    Buffer.from(JSON.stringify(sessionPayload)).toString('base64'),
    SESSION_COOKIE_SECRET
  );

  return cookie.serialize(SESSION_COOKIE_NAME, signed).length;
};

const buildGrantOAuth2Response = (tokenExchange) => {
  return tokensToQueryPayload({ oauth: 2, key: GRANT_PROVIDER_KEY }, tokenExchange);
};

describe('trimGrantSessionResponse', () => {
  it('keeps only id_token for cognito', () => {
    const idToken = makeJwt(1200);
    const accessToken = makeJwt(1200);

    expect(
      trimGrantSessionResponse(
        {
          id_token: idToken,
          access_token: accessToken,
          refresh_token: 'refresh-token',
          raw: {
            id_token: idToken,
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
          },
        },
        'cognito'
      )
    ).toEqual({ id_token: idToken });
  });

  it('shrinks a cognito-sized grant payload below the browser cookie limit', () => {
    const idToken = makeJwt(1800);
    const accessToken = makeJwt(1800);
    const grantResponse = {
      id_token: idToken,
      access_token: accessToken,
      refresh_token: 'refresh-token',
      raw: {
        id_token: idToken,
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
      },
    };

    const before = JSON.stringify(grantResponse).length;
    const trimmed = trimGrantSessionResponse(grantResponse, 'cognito');
    const after = JSON.stringify(trimmed).length;

    expect(before).toBeGreaterThan(BROWSER_COOKIE_LIMIT);
    expect(after).toBeLessThan(BROWSER_COOKIE_LIMIT);
    expect(trimmed).toEqual({ id_token: idToken });
  });

  it('shrinks grant-shaped cognito payloads below the signed session cookie limit', () => {
    const idToken = makeJwt(1800);
    const accessToken = makeJwt(1800);
    const grantResponse = buildGrantOAuth2Response({
      id_token: idToken,
      access_token: accessToken,
      refresh_token: 'refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
    });

    const sessionBeforeTrim = { grant: { response: grantResponse } };
    const trimmed = trimGrantSessionResponse(grantResponse, 'cognito');
    const sessionAfterTrim = { grant: { response: trimmed } };

    expect(grantResponse.raw).toEqual({
      id_token: idToken,
      access_token: accessToken,
      refresh_token: 'refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
    });
    expect(estimateSignedSessionCookieBytes(sessionBeforeTrim)).toBeGreaterThan(
      BROWSER_COOKIE_LIMIT
    );
    expect(estimateSignedSessionCookieBytes(sessionAfterTrim)).toBeLessThan(BROWSER_COOKIE_LIMIT);
    expect(trimmed).toEqual({ id_token: idToken });
  });

  it('keeps only access_token for bearer-token providers', () => {
    expect(
      trimGrantSessionResponse(
        {
          access_token: 'google-access-token',
          refresh_token: 'refresh-token',
          raw: { access_token: 'google-access-token', scope: 'email' },
        },
        'google'
      )
    ).toEqual({ access_token: 'google-access-token' });
  });

  it('keeps twitter oauth1 fields and screen_name', () => {
    expect(
      trimGrantSessionResponse(
        {
          access_token: 'twitter-token',
          access_secret: 'twitter-secret',
          raw: {
            screen_name: 'strapi_user',
            user_id: '12345',
            oauth_token: 'twitter-token',
            oauth_token_secret: 'twitter-secret',
          },
        },
        'twitter'
      )
    ).toEqual({
      access_token: 'twitter-token',
      access_secret: 'twitter-secret',
      raw: { screen_name: 'strapi_user' },
    });
  });

  it('keeps vk email and user_id from the grant session', () => {
    expect(
      trimGrantSessionResponse(
        {
          access_token: 'vk-token',
          raw: {
            email: 'user@example.com',
            user_id: 42,
            expires_in: 86400,
          },
        },
        'vk'
      )
    ).toEqual({
      access_token: 'vk-token',
      raw: { email: 'user@example.com', user_id: 42 },
    });
  });

  it('returns the original value when grant response is missing', () => {
    expect(trimGrantSessionResponse(undefined, 'google')).toBeUndefined();
    expect(trimGrantSessionResponse(null, 'google')).toBeNull();
  });
});
