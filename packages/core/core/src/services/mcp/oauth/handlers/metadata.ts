import type { Core } from '@strapi/types';
import { SUPPORTED_GRANT_TYPES, SUPPORTED_TOKEN_ENDPOINT_AUTH_METHODS } from '../constants';
import type { McpOAuthHandlerDependencies } from './types';

/**
 * RFC 9728 protected resource metadata.
 */
export const createProtectedResourceMetadataHandler =
  (deps: McpOAuthHandlerDependencies): Core.MiddlewareHandler =>
  (ctx) => {
    const { config } = deps;

    ctx.body = {
      resource: config.resource,
      authorization_servers: [config.issuer],
      bearer_methods_supported: ['header'],
    };
  };

/**
 * RFC 8414 authorization server metadata.
 */
export const createAuthorizationServerMetadataHandler =
  (deps: McpOAuthHandlerDependencies): Core.MiddlewareHandler =>
  (ctx) => {
    const { config } = deps;

    ctx.body = {
      issuer: config.issuer,
      authorization_endpoint: config.authorizationEndpoint,
      token_endpoint: config.tokenEndpoint,
      ...(config.isDynamicClientRegistrationEnabled()
        ? { registration_endpoint: config.registrationEndpoint }
        : {}),
      revocation_endpoint: config.revocationEndpoint,
      response_types_supported: ['code'],
      grant_types_supported: [...SUPPORTED_GRANT_TYPES],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: [...SUPPORTED_TOKEN_ENDPOINT_AUTH_METHODS],
    };
  };
