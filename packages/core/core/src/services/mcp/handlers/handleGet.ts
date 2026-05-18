import type { Core } from '@strapi/types';
import { extractSessionId } from '../internal/extractSessionId';
import { sendJsonRpcError } from '../utils/sendJsonRpcError';
import type { McpHandlerDependencies } from './types';

export const createGetHandler = (deps: McpHandlerDependencies): Core.MiddlewareHandler => {
  const { strapi, sessionManager } = deps;

  return async (ctx) => {
    const req = ctx.req;
    const res = ctx.res;
    const sessionId = extractSessionId(req);

    if (sessionId === undefined) {
      sendJsonRpcError(res, 'SESSION_REQUIRED');
      return;
    }

    const session = sessionManager.get(sessionId);
    if (session === undefined) {
      sendJsonRpcError(res, 'INVALID_SESSION');
      return;
    }

    // GET requests establish long-lived SSE streams; transport manages their lifecycle.
    session.updateActivity();

    try {
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
