import crypto from 'node:crypto';
import { URLSearchParams } from 'node:url';
import type { GrantResponse } from '../../types';

type OAuth1Request = {
  method: string;
  url: string;
  params?: Record<string, string | undefined>;
  consumerKey?: string;
  clientCredential?: string;
  token?: string;
  tokenCredential?: string;
};

const encode = (str: string | undefined) =>
  encodeURIComponent(String(str)).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

const sortKeys = (keys: string[]) =>
  keys.sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

/**
 * OAuth 1.0 (RFC 5849) request signature — HMAC-SHA1 is required by the protocol.
 * This is not password storage or user-credential hashing (those use bcrypt).
 */
const signRfc5849BaseString = (signatureBaseString: string, signingMaterial: string) => {
  // codeql[js/insufficient-password-hash] OAuth 1.0 signing material, not user password storage
  return crypto.createHmac('sha1', signingMaterial).update(signatureBaseString).digest('base64');
};

/** Build the signed OAuth 1 authorization header for a request. */
const buildOAuth1Header = ({
  method,
  url,
  params,
  consumerKey,
  clientCredential,
  token,
  tokenCredential,
}: OAuth1Request) => {
  const requestParameters: Record<string, string | undefined> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...(token ? { oauth_token: token } : {}),
    ...params,
  };

  const paramString = sortKeys(Object.keys(requestParameters))
    .map((key) => `${encode(key)}=${encode(requestParameters[key])}`)
    .join('&');

  const signatureBaseString = [method.toUpperCase(), encode(url), encode(paramString)].join('&');
  const signingMaterial = `${encode(clientCredential)}&${encode(tokenCredential || '')}`;
  const signature = signRfc5849BaseString(signatureBaseString, signingMaterial);

  const headerParameters: Record<string, string | undefined> = {
    ...requestParameters,
    oauth_signature: signature,
  };
  const header = `OAuth ${sortKeys(Object.keys(headerParameters))
    .map((key) => `${encode(key)}="${encode(headerParameters[key])}"`)
    .join(', ')}`;

  return header;
};

const oauth1Request = async ({
  method,
  url,
  consumerKey,
  clientCredential,
  token,
  tokenCredential,
  params = {},
}: OAuth1Request): Promise<GrantResponse> => {
  const authorization = buildOAuth1Header({
    method,
    url,
    params,
    consumerKey,
    clientCredential,
    token,
    tokenCredential,
  });

  const response = await fetch(url, {
    method,
    headers: { Authorization: authorization },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `OAuth1 request failed (${response.status})`);
  }

  return Object.fromEntries(new URLSearchParams(text));
};

/** Request temporary OAuth 1 credentials tied to the callback URL. */
const requestToken = async ({
  requestUrl,
  redirectUri,
  consumerKey,
  clientCredential,
}: {
  requestUrl: string;
  redirectUri: string;
  consumerKey?: string;
  clientCredential?: string;
}) =>
  oauth1Request({
    method: 'POST',
    url: requestUrl,
    consumerKey,
    clientCredential,
    params: { oauth_callback: redirectUri },
  });

/** Exchange the OAuth 1 verifier and temporary credentials for access credentials. */
const accessToken = async ({
  accessUrl,
  consumerKey,
  clientCredential,
  oauthToken,
  oauthVerifier,
  oauthTokenCredential,
}: {
  accessUrl: string;
  consumerKey?: string;
  clientCredential?: string;
  oauthToken: string;
  oauthVerifier?: string;
  oauthTokenCredential?: string;
}) =>
  oauth1Request({
    method: 'POST',
    url: accessUrl,
    consumerKey,
    clientCredential,
    token: oauthToken,
    tokenCredential: oauthTokenCredential,
    params: { oauth_verifier: oauthVerifier },
  });

/** Fetch a Twitter profile with signed OAuth 1 query parameters. */
const twitterGet = async ({
  url,
  accessToken,
  accessCredential,
  consumerKey,
  clientCredential,
  qs = {},
}: {
  url: string;
  accessToken?: string;
  accessCredential: string;
  consumerKey?: string;
  clientCredential?: string;
  qs?: Record<string, string | number | null | undefined>;
}) => {
  const target = new URL(url);
  const signedParams: Record<string, string> = {};

  Object.entries(qs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const stringValue = String(value);
      target.searchParams.set(key, stringValue);
      // RFC 5849 §3.4.1: base-string URI excludes the query; params are signed separately.
      signedParams[key] = stringValue;
    }
  });

  const authorization = buildOAuth1Header({
    method: 'GET',
    url: target.origin + target.pathname,
    params: signedParams,
    consumerKey,
    clientCredential,
    token: accessToken,
    tokenCredential: accessCredential,
  });

  const response = await fetch(target, {
    headers: { Authorization: authorization },
  });

  const body = (await response.json()) as {
    email?: string;
    screen_name?: string;
    errors?: { message?: string }[];
  };
  if (!response.ok) {
    throw new Error(body.errors?.[0]?.message || `Twitter API error (${response.status})`);
  }

  return { body };
};

export { buildOAuth1Header, requestToken, accessToken, twitterGet };
