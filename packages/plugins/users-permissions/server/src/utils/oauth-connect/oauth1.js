'use strict';

const crypto = require('node:crypto');
const { URLSearchParams } = require('node:url');

const encode = (str) =>
  encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.codePointAt(0).toString(16).toUpperCase()}`
  );

const sortKeys = (keys) =>
  keys.sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

/**
 * OAuth 1.0 (RFC 5849) request signature — HMAC-SHA1 is required by the protocol.
 * This is not password storage or user-credential hashing (those use bcrypt).
 */
const signRfc5849BaseString = (signatureBaseString, signingMaterial) => {
  // codeql[js/insufficient-password-hash] OAuth 1.0 signing material, not user password storage
  return crypto.createHmac('sha1', signingMaterial).update(signatureBaseString).digest('base64');
};

const buildOAuth1Header = ({
  method,
  url,
  params,
  consumerKey,
  clientCredential,
  token,
  tokenCredential,
}) => {
  const requestParameters = {
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

  const headerParameters = { ...requestParameters, oauth_signature: signature };
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
}) => {
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

const requestToken = async ({ requestUrl, redirectUri, consumerKey, clientCredential }) =>
  oauth1Request({
    method: 'POST',
    url: requestUrl,
    consumerKey,
    clientCredential,
    params: { oauth_callback: redirectUri },
  });

const accessToken = async ({
  accessUrl,
  consumerKey,
  clientCredential,
  oauthToken,
  oauthVerifier,
  oauthTokenCredential,
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

const twitterGet = async ({
  url,
  accessToken,
  accessCredential,
  consumerKey,
  clientCredential,
  qs = {},
}) => {
  const target = new URL(url);
  const signedParams = {};

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

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.errors?.[0]?.message || `Twitter API error (${response.status})`);
  }

  return { body };
};

module.exports = {
  buildOAuth1Header,
  requestToken,
  accessToken,
  twitterGet,
};
