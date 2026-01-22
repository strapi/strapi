// eslint-disable-next-line import/extensions
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Core } from '@strapi/types';
import { randomUUID } from 'node:crypto';
import { extractSessionId } from '../internal/extractSessionId';
import { McpSession } from '../session';
import { sendJsonRpcError } from '../utils/sendJsonRpcError';
import { withTimeout } from '../utils/withTimeout';
import type { McpHandlerDependencies } from './types';

export const createPostHandler = (deps: McpHandlerDependencies): Core.MiddlewareHandler => {
  const { strapi, sessionManager, config, createServerWithRegistries, capabilityDefinitions } =
    deps;

  return async (ctx) => {
    const req = ctx.req;
    const res = ctx.res;
    const sessionId = extractSessionId(req);

    try {
      let transport: StreamableHTTPServerTransport;

      // Existing session handling
      if (sessionId !== undefined) {
        const existingSession = sessionManager.get(sessionId);
        if (existingSession === undefined) {
          sendJsonRpcError(res, 400, -32000, 'Invalid session');
          return;
        }
        existingSession.updateActivity();
        transport = existingSession.transport;

        // Handle request with existing session
        const requestBody = ctx.request.body ?? null;
        await withTimeout(
          transport.handleRequest(req, res, requestBody),
          config.requestTimeoutMs,
          'transport.handleRequest'
        );
      } else {
        if (sessionManager.hasReachedMaxSessions() === true) {
          sendJsonRpcError(res, 503, -32001, 'Maximum number of sessions reached');
          return;
        }

        // New session initialization
        const requestBody = ctx.request.body ?? null;

        const { mcpServer, registries } = createServerWithRegistries({
          strapi,
          definitions: capabilityDefinitions,
          isDevMode: config.isDevMode(),
        });

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized(id) {
            sessionManager.set(
              id,
              new McpSession({
                server: mcpServer,
                transport,
                toolRegistry: registries.toolRegistry,
                promptRegistry: registries.promptRegistry,
                resourceRegistry: registries.resourceRegistry,
              })
            );
            strapi.log.info('[MCP] Session initialized', { sessionId: id });
          },
          onsessionclosed(id) {
            sessionManager.delete(id);
            strapi.log.info('[MCP] Session closed', { sessionId: id });
          },
        });

        await withTimeout(
          mcpServer.connect(transport),
          config.requestTimeoutMs,
          'mcpServer.connect'
        );
        await withTimeout(
          transport.handleRequest(req, res, requestBody),
          config.requestTimeoutMs,
          'transport.handleRequest'
        );
      }
    } catch (error) {
      strapi.log.error('[MCP] Error handling POST request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      sendJsonRpcError(res, 500, -32603, 'Internal error');
    }
  };
};
