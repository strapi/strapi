'use strict';

const crypto = require('crypto');
const { URLSearchParams } = require('url');

const encode = (str) =>
  encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

const buildOAuth1Header = ({
  method,
  url,
  params,
  consumerKey,
  consumerSecret,
  token,
  tokenSecret,
}) => {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...(token ? { oauth_token: token } : {}),
    ...params,
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((key) => `${encode(key)}=${encode(oauthParams[key])}`)
    .join('&');

  const baseString = [method.toUpperCase(), encode(url), encode(paramString)].join('&');
  const signingKey = `${encode(consumerSecret)}&${encode(tokenSecret || '')}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  const headerParams = { ...oauthParams, oauth_signature: signature };
  const header = `OAuth ${Object.keys(headerParams)
    .sort()
    .map((key) => `${encode(key)}="${encode(headerParams[key])}"`)
    .join(', ')}`;

  return header;
};

const oauth1Request = async ({
  method,
  url,
  consumerKey,
  consumerSecret,
  token,
  tokenSecret,
  params = {},
}) => {
  const authorization = buildOAuth1Header({
    method,
    url,
    params,
    consumerKey,
    consumerSecret,
    token,
    tokenSecret,
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

const requestToken = async ({ requestUrl, redirectUri, consumerKey, consumerSecret }) =>
  oauth1Request({
    method: 'POST',
    url: requestUrl,
    consumerKey,
    consumerSecret,
    params: { oauth_callback: redirectUri },
  });

const accessToken = async ({
  accessUrl,
  consumerKey,
  consumerSecret,
  oauthToken,
  oauthVerifier,
  oauthTokenSecret,
}) =>
  oauth1Request({
    method: 'POST',
    url: accessUrl,
    consumerKey,
    consumerSecret,
    token: oauthToken,
    tokenSecret: oauthTokenSecret,
    params: { oauth_verifier: oauthVerifier },
  });

const twitterGet = async ({
  url,
  accessToken,
  accessSecret,
  consumerKey,
  consumerSecret,
  qs = {},
}) => {
  const target = new URL(url);
  Object.entries(qs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      target.searchParams.set(key, String(value));
    }
  });

  const authorization = buildOAuth1Header({
    method: 'GET',
    url: target.origin + target.pathname + target.search,
    params: {},
    consumerKey,
    consumerSecret,
    token: accessToken,
    tokenSecret: accessSecret,
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
