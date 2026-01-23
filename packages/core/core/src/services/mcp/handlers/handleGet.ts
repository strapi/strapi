import type { Core } from '@strapi/types';
import { extractSessionId } from '../internal/extractSessionId';
import { sendJsonRpcError } from '../utils/sendJsonRpcError';
import { withTimeout } from '../utils/withTimeout';
import type { McpHandlerDependencies } from './types';

export const createGetHandler = (deps: McpHandlerDependencies): Core.MiddlewareHandler => {
  const { strapi, sessionManager, config } = deps;

  return async (ctx) => {
    const req = ctx.req;
    const res = ctx.res;
    const sessionId = extractSessionId(req);

    if (sessionId === undefined) {
      sendJsonRpcError(res, 400, -32000, 'Session ID required');
      return;
    }

    const session = sessionManager.get(sessionId);
    if (session === undefined) {
      sendJsonRpcError(res, 400, -32000, 'Invalid session');
      return;
    }

    // Update activity to prevent timeout during active SSE/long-polling connections.
    // GET requests in MCP context represent active client engagement waiting for
    // server messages, not idempotent data retrieval.
    session.updateActivity();

    try {
      await withTimeout(
        session.transport.handleRequest(req, res, null),
        config.requestTimeoutMs,
        'transport.handleRequest'
      );
    } catch (error) {
      strapi.log.error('[MCP] Error handling GET request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      sendJsonRpcError(res, 500, -32603, 'Internal error');
    }
  };
};
