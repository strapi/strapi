import type { Core } from '@strapi/types';
import { extractSessionId } from '../internal/extractSessionId';
import { syncMcpSessionCapabilities } from '../internal/syncMcpSessionCapabilities';
import { sendJsonRpcError } from '../utils/sendJsonRpcError';
import { withTimeout } from '../utils/withTimeout';
import type { McpHandlerDependencies } from './types';

export const createDeleteHandler = (deps: McpHandlerDependencies): Core.MiddlewareHandler => {
  const { strapi, authenticationStrategy, sessionManager, config, capabilityDefinitions } = deps;

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

    try {
      syncMcpSessionCapabilities({
        session,
        definitions: capabilityDefinitions,
        ability: authResult.ability,
        isDevMode: config.isDevMode(),
      });

      await withTimeout(
        session.transport.handleRequest(req, res, null),
        config.requestTimeoutMs,
        'transport.handleRequest'
      );
    } catch (error) {
      strapi.log.error('[MCP] Error handling DELETE request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      sendJsonRpcError(res, 'INTERNAL_ERROR');
    }
  };
};
