import crypto from 'node:crypto';
import type { GrantResponse, OAuthEndpoints, ProviderSettings } from '../../types';

type Provider = OAuthEndpoints & { name: string };
type AuthorizationOptions = {
  key?: string;
  redirectUri: string;
  scope?: ProviderSettings['scope'];
  subdomain?: string;
};

const formatScope = (scope: ProviderSettings['scope'], delimiter = ',') => {
  if (Array.isArray(scope)) {
    return scope.filter(Boolean).join(delimiter) || undefined;
  }
  return scope || undefined;
};

/** Substitute the configured provider host into an endpoint URL. */
const substituteSubdomain = (url: string, subdomain?: string) =>
  subdomain ? url.replace('[subdomain]', subdomain) : url;

/** Build a provider authorization URL with its required scope syntax. */
const buildAuthorizeUrl = (
  provider: Provider & { authorize_url: string },
  { key, redirectUri, scope, subdomain }: AuthorizationOptions
) => {
  const authorizeUrl = substituteSubdomain(provider.authorize_url, subdomain);
  const params = new URLSearchParams({
    client_id: String(key),
    response_type: 'code',
    redirect_uri: redirectUri,
  });

  const formattedScope = formatScope(scope, provider.scope_delimiter);
  if (formattedScope) {
    params.set('scope', formattedScope);
  }

  if (provider.name === 'instagram' && /^\d+$/.test(key ?? '')) {
    params.delete('client_id');
    params.set('app_id', String(key));
    if (formattedScope) {
      params.set('scope', formattedScope.replaceAll(' ', ','));
    }
  }

  return `${authorizeUrl}?${params.toString()}`;
};

const parseTokenResponse = async (response: Response): Promise<GrantResponse> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<GrantResponse>;
  }
  const text = await response.text();
  return Object.fromEntries(new URLSearchParams(text));
};

/** Exchange the authorization code using the provider's token endpoint settings. */
const exchangeAuthorizationCode = async (
  provider: Provider & { access_url: string },
  {
    key,
    secret,
    redirectUri,
    code,
    subdomain,
  }: AuthorizationOptions & { secret?: string; code: string }
) => {
  const accessUrl = substituteSubdomain(provider.access_url, subdomain);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: String(key),
    client_secret: String(secret),
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };

  if (provider.token_endpoint_auth_method === 'client_secret_basic') {
    const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
    headers.Authorization = `Basic ${credentials}`;
    body.delete('client_id');
    body.delete('client_secret');
  }

  if (provider.name === 'instagram' && /^\d+$/.test(key ?? '')) {
    body.delete('client_id');
    body.delete('client_secret');
    body.set('app_id', String(key));
    body.set('app_secret', String(secret));
  }

  const response = await fetch(accessUrl, { method: 'POST', headers, body });
  const output = await parseTokenResponse(response);

  if (!response.ok) {
    throw new Error(
      String(
        output.error_description || output.error || `Token exchange failed (${response.status})`
      )
    );
  }

  return output;
};

/** Normalize OAuth token responses into the grant session shape. */
const tokensToQueryPayload = (
  provider: Pick<OAuthEndpoints, 'oauth'>,
  tokenResponse: GrantResponse
) => {
  const data: GrantResponse = { raw: tokenResponse };

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

/** Generate the unpredictable state value stored for the callback check. */
const generateState = () => crypto.randomBytes(20).toString('hex');

export {
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  tokensToQueryPayload,
  generateState,
  substituteSubdomain,
};
