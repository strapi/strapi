/**
 * Session manager origin under which MCP OAuth grants are stored.
 */
export const MCP_SESSION_ORIGIN = 'mcp';

export const MCP_OAUTH_CLIENT_UID = 'admin::mcp-oauth-client';
export const MCP_OAUTH_CODE_UID = 'admin::mcp-oauth-authorization-code';

export const OAUTH_PATHS = {
  authorize: '/mcp/oauth/authorize',
  token: '/mcp/oauth/token',
  register: '/mcp/oauth/register',
  revoke: '/mcp/oauth/revoke',
  protectedResourceMetadata: '/.well-known/oauth-protected-resource',
  authorizationServerMetadata: '/.well-known/oauth-authorization-server',
} as const;

/**
 * Admin-router paths (served under the admin prefix) used by the consent screen.
 */
export const CONSENT_ADMIN_PATHS = {
  authorizationRequest: '/mcp/oauth/authorization-request',
  consent: '/mcp/oauth/consent',
} as const;

/**
 * Path of the consent page inside the admin SPA, appended to `admin.absoluteUrl`.
 */
export const CONSENT_PAGE_PATH = '/mcp/oauth/consent';

export const SUPPORTED_GRANT_TYPES = ['authorization_code', 'refresh_token'] as const;
export const SUPPORTED_RESPONSE_TYPES = ['code'] as const;
export const SUPPORTED_TOKEN_ENDPOINT_AUTH_METHODS = [
  'none',
  'client_secret_basic',
  'client_secret_post',
] as const;

export type TokenEndpointAuthMethod = (typeof SUPPORTED_TOKEN_ENDPOINT_AUTH_METHODS)[number];
