import type { Core } from '@strapi/types';
import { MCP_SESSION_ORIGIN } from './constants';
import { McpOAuthConfiguration } from './configuration';
import { createClientStore } from './services/client-store';
import { createCodeStore } from './services/code-store';
import { createGrantSessionService } from './services/grant-session';
import { createMcpOAuthTokenAuthenticator } from './accessTokenAuthenticator';
import {
  createAuthorizationServerMetadataHandler,
  createProtectedResourceMetadataHandler,
} from './handlers/metadata';
import { createAuthorizeHandler } from './handlers/authorize';
import { createTokenHandler } from './handlers/token';
import { createRegisterHandler } from './handlers/register';
import { createRevokeHandler } from './handlers/revoke';
import {
  createGetAuthorizationRequestHandler,
  createSubmitConsentHandler,
} from './handlers/consent';
import { createMcpOAuthConsentRouter, createMcpOAuthRoutes } from './routes';
import type { McpOAuthHandlerDependencies } from './handlers/types';

export type McpOAuthModule = ReturnType<typeof createMcpOAuthModule>;

/**
 * Wires the MCP OAuth 2.1 authorization server: endpoint routes, the admin consent
 * endpoints, the session origin for grants, and the /mcp bearer authenticator.
 */
export const createMcpOAuthModule = (strapi: Core.Strapi, config: McpOAuthConfiguration) => {
  const clientStore = createClientStore(strapi);
  const codeStore = createCodeStore(strapi);

  let jwtSecret: string | null = null;
  const getJwtSecret = () => {
    jwtSecret ??= config.getJwtSecret();

    return jwtSecret;
  };

  return {
    accessTokenAuthenticator: createMcpOAuthTokenAuthenticator(strapi),

    /**
     * Registers the 'mcp' session manager origin and mounts every OAuth route.
     * Called from the MCP service start() when OAuth is enabled.
     */
    start(mcpPath: string) {
      strapi.sessionManager.defineOrigin(MCP_SESSION_ORIGIN, {
        jwtSecret: getJwtSecret(),
        accessTokenLifespan: config.accessTokenLifespan,
        maxRefreshTokenLifespan: config.maxRefreshTokenLifespan,
        idleRefreshTokenLifespan: config.idleRefreshTokenLifespan,
        maxSessionLifespan: config.maxRefreshTokenLifespan,
        idleSessionLifespan: config.idleRefreshTokenLifespan,
      });

      const deps: McpOAuthHandlerDependencies = {
        strapi,
        config,
        clientStore,
        codeStore,
        grantSessions: createGrantSessionService(strapi, getJwtSecret()),
      };

      strapi.server.routes(
        createMcpOAuthRoutes(config, mcpPath, {
          protectedResourceMetadata: createProtectedResourceMetadataHandler(deps),
          authorizationServerMetadata: createAuthorizationServerMetadataHandler(deps),
          authorize: createAuthorizeHandler(deps),
          token: createTokenHandler(deps),
          register: createRegisterHandler(deps),
          revoke: createRevokeHandler(deps),
        })
      );

      strapi.server.routes(
        createMcpOAuthConsentRouter({
          getAuthorizationRequest: createGetAuthorizationRequestHandler(deps),
          submitConsent: createSubmitConsentHandler(deps),
        })
      );

      strapi.log.info(`[MCP] OAuth authorization server available at ${config.issuer}`);
    },
  };
};

export { McpOAuthConfiguration } from './configuration';
