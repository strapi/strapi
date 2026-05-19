import type { Core } from '@strapi/types';
import { extractSessionId } from '../internal/extractSessionId';
import { syncMcpSessionCapabilities } from '../internal/syncMcpSessionCapabilities';
import { sendJsonRpcError } from '../utils/sendJsonRpcError';
import type { McpHandlerDependencies } from './types';

export const createGetHandler = (deps: McpHandlerDependencies): Core.MiddlewareHandler => {
  const { strapi, authenticationStrategy, sessionManager, capabilityDefinitions, config } = deps;

  return async (ctx) => {
    const req = ctx.req;
    const res = ctx.res;
    const sessionId = extractSessionId(req);

    const authResult = await authenticationStrategy.authenticate(ctx);
    if (authResult.authenticated === false) {
      sendJsonRpcError(res, 'SESSION_REQUIRED');
      return;
    }

    if (sessionId === undefined) {
      sendJsonRpcError(res, 'SESSION_REQUIRED');
      return;
    }

    const session = sessionManager.get(sessionId);
    if (session === undefined) {
      sendJsonRpcError(res, 'INVALID_SESSION');
      return;
    }
    if (String(session.adminTokenId) !== String(authResult.credentials.id)) {
      sendJsonRpcError(res, 'INVALID_SESSION');
      return;
    }

    // GET requests establish long-lived SSE streams; transport manages their lifecycle.
    session.updateActivity();

    try {
      syncMcpSessionCapabilities({
        session,
        definitions: capabilityDefinitions,
        ability: authResult.ability,
        isDevMode: config.isDevMode(),
      });

      await session.transport.handleRequest(req, res, null);
    } catch (error) {
      strapi.log.error('[MCP] Error handling GET request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      sendJsonRpcError(res, 'INTERNAL_ERROR');
    }
  };
};
