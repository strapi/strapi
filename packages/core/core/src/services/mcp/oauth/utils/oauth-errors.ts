import type { Context } from 'koa';

export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'invalid_scope'
  | 'invalid_target'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'unsupported_response_type'
  | 'access_denied'
  | 'server_error'
  | 'invalid_client_metadata'
  | 'invalid_redirect_uri';

/**
 * RFC 6749 §5.2 JSON error response.
 */
export const sendOAuthError = (
  ctx: Context,
  status: number,
  error: OAuthErrorCode,
  errorDescription?: string
): void => {
  ctx.status = status;
  ctx.set('Cache-Control', 'no-store');
  ctx.set('Pragma', 'no-cache');
  ctx.body = {
    error,
    ...(errorDescription ? { error_description: errorDescription } : {}),
  };
};

/**
 * RFC 6749 §4.1.2.1 error redirect to the client's redirect URI, with RFC 9207 `iss`.
 */
export const buildErrorRedirect = (
  redirectUri: string,
  params: {
    error: OAuthErrorCode;
    errorDescription?: string;
    state?: string;
    iss: string;
  }
): string => {
  const url = new URL(redirectUri);

  url.searchParams.set('error', params.error);
  if (params.errorDescription) {
    url.searchParams.set('error_description', params.errorDescription);
  }
  if (params.state !== undefined) {
    url.searchParams.set('state', params.state);
  }
  url.searchParams.set('iss', params.iss);

  return url.toString();
};

/**
 * RFC 6749 §4.1.2 success redirect, with RFC 9207 `iss`.
 */
export const buildCodeRedirect = (
  redirectUri: string,
  params: { code: string; state?: string; iss: string }
): string => {
  const url = new URL(redirectUri);

  url.searchParams.set('code', params.code);
  if (params.state !== undefined) {
    url.searchParams.set('state', params.state);
  }
  url.searchParams.set('iss', params.iss);

  return url.toString();
};
