import type { Core } from '@strapi/types';
import { CONSENT_ADMIN_PATHS, OAUTH_PATHS } from './constants';
import type { McpOAuthConfiguration } from './configuration';

export type McpOAuthRouteHandlers = {
  protectedResourceMetadata: Core.MiddlewareHandler;
  authorizationServerMetadata: Core.MiddlewareHandler;
  authorize: Core.MiddlewareHandler;
  token: Core.MiddlewareHandler;
  register: Core.MiddlewareHandler;
  revoke: Core.MiddlewareHandler;
};

export type McpOAuthConsentHandlers = {
  getAuthorizationRequest: Core.MiddlewareHandler;
  submitConsent: Core.MiddlewareHandler;
};

/**
 * Public OAuth endpoints, mounted unprefixed on the server router. They authenticate
 * OAuth-style (client credentials, codes, PKCE) inside the handlers, so Strapi route
 * auth is disabled, like the /mcp routes themselves.
 */
export const createMcpOAuthRoutes = (
  config: McpOAuthConfiguration,
  mcpPath: string,
  handlers: McpOAuthRouteHandlers
): Omit<Core.Route, 'info'>[] => {
  const noAuth = { auth: false } as const;

  const routes: Omit<Core.Route, 'info'>[] = [
    {
      method: 'GET',
      path: OAUTH_PATHS.protectedResourceMetadata,
      handler: handlers.protectedResourceMetadata,
      config: noAuth,
    },
    {
      method: 'GET',
      path: `${OAUTH_PATHS.protectedResourceMetadata}${mcpPath}`,
      handler: handlers.protectedResourceMetadata,
      config: noAuth,
    },
    {
      method: 'GET',
      path: OAUTH_PATHS.authorizationServerMetadata,
      handler: handlers.authorizationServerMetadata,
      config: noAuth,
    },
    {
      method: 'GET',
      path: `${OAUTH_PATHS.authorizationServerMetadata}${mcpPath}`,
      handler: handlers.authorizationServerMetadata,
      config: noAuth,
    },
    {
      method: 'GET',
      path: OAUTH_PATHS.authorize,
      handler: handlers.authorize,
      config: noAuth,
    },
    {
      method: 'POST',
      path: OAUTH_PATHS.token,
      handler: handlers.token,
      config: noAuth,
    },
    {
      method: 'POST',
      path: OAUTH_PATHS.revoke,
      handler: handlers.revoke,
      config: noAuth,
    },
  ];

  if (config.isDynamicClientRegistrationEnabled()) {
    routes.push({
      method: 'POST',
      path: OAUTH_PATHS.register,
      handler: handlers.register,
      // Registration is the only unauthenticated endpoint that writes rows, so it is
      // rate limited. The other endpoints only deal in 256-bit random credentials.
      // The default rate-limit key starts with request.body.email, which an anonymous
      // caller can vary to dodge the limit; a static prefixKey keys on IP alone.
      config: {
        auth: false,
        middlewares: [{ name: 'admin::rateLimit', config: { prefixKey: 'mcp:oauth:register' } }],
      },
    });
  }

  return routes;
};

/**
 * Consent endpoints for the admin panel, mounted on the admin router so the admin session
 * strategy (and SSO) applies.
 */
export const createMcpOAuthConsentRouter = (handlers: McpOAuthConsentHandlers): Core.Router => ({
  type: 'admin',
  prefix: '/admin',
  routes: [
    {
      method: 'GET',
      path: CONSENT_ADMIN_PATHS.authorizationRequest,
      handler: handlers.getAuthorizationRequest,
      info: { type: 'admin' },
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: CONSENT_ADMIN_PATHS.consent,
      handler: handlers.submitConsent,
      info: { type: 'admin' },
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
});
