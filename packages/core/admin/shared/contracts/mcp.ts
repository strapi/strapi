import type { errors } from '@strapi/utils';

/**
 * Display data for a pending MCP OAuth authorization request.
 */
export interface McpOAuthAuthorizationRequestData {
  client: {
    name: string;
    uri?: string;
    logoUri?: string;
  };
  redirectUri: string;
  redirectHost: string;
  scope?: string;
}

/**
 * GET /admin/mcp/oauth/authorization-request?ticket=... - Describe a pending authorization
 * request so the consent screen can display it.
 */
export declare namespace GetMcpOAuthAuthorizationRequest {
  export interface Request {
    query: {
      ticket: string;
    };
    body: {};
  }

  export interface Response {
    data: McpOAuthAuthorizationRequestData;
    error?: errors.ApplicationError;
  }
}

/**
 * POST /admin/mcp/oauth/consent - Record the admin's decision on a pending authorization
 * request. Returns the URL the browser must navigate to (the client's redirect URI with
 * either an authorization code or an access_denied error).
 */
export declare namespace SubmitMcpOAuthConsent {
  export interface Request {
    query: {};
    body: {
      ticket: string;
      decision: 'approve' | 'deny';
    };
  }

  export interface Response {
    data: {
      redirectTo: string;
    };
    error?: errors.ApplicationError;
  }
}
