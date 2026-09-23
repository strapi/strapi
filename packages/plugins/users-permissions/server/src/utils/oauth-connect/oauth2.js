'use strict';

const crypto = require('node:crypto');

const formatScope = (scope, delimiter = ',') => {
  if (Array.isArray(scope)) {
    return scope.filter(Boolean).join(delimiter) || undefined;
  }
  return scope || undefined;
};

const substituteSubdomain = (url, subdomain) =>
  subdomain ? url.replace('[subdomain]', subdomain) : url;

const buildAuthorizeUrl = (provider, { key, redirectUri, scope, subdomain }) => {
  const authorizeUrl = substituteSubdomain(provider.authorize_url, subdomain);
  const params = new URLSearchParams({
    client_id: key,
    response_type: 'code',
    redirect_uri: redirectUri,
  });

  const formattedScope = formatScope(scope, provider.scope_delimiter);
  if (formattedScope) {
    params.set('scope', formattedScope);
  }

  if (provider.name === 'instagram' && /^\d+$/.test(key)) {
    params.delete('client_id');
    params.set('app_id', key);
    if (formattedScope) {
      params.set('scope', formattedScope.replaceAll(' ', ','));
    }
  }

  return `${authorizeUrl}?${params.toString()}`;
};

const parseTokenResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return Object.fromEntries(new URLSearchParams(text));
};

const exchangeAuthorizationCode = async (
  provider,
  { key, secret, redirectUri, code, subdomain }
) => {
  const accessUrl = substituteSubdomain(provider.access_url, subdomain);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: key,
    client_secret: secret,
  });

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

  if (provider.token_endpoint_auth_method === 'client_secret_basic') {
    const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
    headers.Authorization = `Basic ${credentials}`;
    body.delete('client_id');
    body.delete('client_secret');
  }

  if (provider.name === 'instagram' && /^\d+$/.test(key)) {
    body.delete('client_id');
    body.delete('client_secret');
    body.set('app_id', key);
    body.set('app_secret', secret);
  }

  const response = await fetch(accessUrl, { method: 'POST', headers, body });
  const output = await parseTokenResponse(response);

  if (!response.ok) {
    throw new Error(
      output.error_description || output.error || `Token exchange failed (${response.status})`
    );
  }

  return output;
};

const tokensToQueryPayload = (provider, tokenResponse) => {
  const data = { raw: tokenResponse };

  if (provider.oauth === 1) {
    if (tokenResponse.oauth_token) {
      data.access_token = tokenResponse.oauth_token;
    }
    if (tokenResponse.oauth_token_secret) {
      data.access_secret = tokenResponse.oauth_token_secret;
    }
    return data;
  }

  if (tokenResponse.id_token) {
    data.id_token = tokenResponse.id_token;
  }
  if (tokenResponse.access_token) {
    data.access_token = tokenResponse.access_token;
  }
  if (tokenResponse.refresh_token) {
    data.refresh_token = tokenResponse.refresh_token;
  }

  return data;
};

const generateState = () => crypto.randomBytes(20).toString('hex');

module.exports = {
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  tokensToQueryPayload,
  generateState,
  substituteSubdomain,
};
