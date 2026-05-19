// eslint-disable-next-line import/extensions
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Core } from '@strapi/types';
import { randomUUID } from 'node:crypto';
import { extractSessionId } from '../internal/extractSessionId';
import { McpSession } from '../internal/McpSession';
import { syncMcpSessionCapabilities } from '../internal/syncMcpSessionCapabilities';
import { sendJsonRpcError } from '../utils/sendJsonRpcError';
import { withTimeout } from '../utils/withTimeout';
import type { McpHandlerDependencies } from './types';

export const createPostHandler = (deps: McpHandlerDependencies): Core.MiddlewareHandler => {
  const {
    strapi,
    authenticationStrategy,
    sessionManager,
    config,
    createServerWithRegistries,
    capabilityDefinitions,
  } = deps;

  return async (ctx) => {
    const req = ctx.req;
    const res = ctx.res;
    const sessionId = extractSessionId(req);

    try {
      const authResult = await authenticationStrategy.authenticate(ctx);
      if (authResult.authenticated === false) {
        sendJsonRpcError(res, 'SESSION_REQUIRED');
        return;
      }

      let transport: StreamableHTTPServerTransport;

      // Existing session handling
      if (sessionId !== undefined) {
        const existingSession = sessionManager.get(sessionId);
        if (existingSession === undefined) {
          sendJsonRpcError(res, 'INVALID_SESSION');
          return;
        }
        if (String(existingSession.adminTokenId) !== String(authResult.credentials.id)) {
          sendJsonRpcError(res, 'INVALID_SESSION');
          return;
        }
        existingSession.updateActivity();
        syncMcpSessionCapabilities({
          session: existingSession,
          definitions: capabilityDefinitions,
          ability: authResult.ability,
          isDevMode: config.isDevMode(),
        });
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
          sendJsonRpcError(res, 'MAX_SESSIONS_REACHED');
          return;
        }

        // New session initialization
        const requestBody = ctx.request.body ?? null;

        const { mcpServer, registries } = createServerWithRegistries({
          strapi,
          definitions: capabilityDefinitions,
          isDevMode: config.isDevMode(),
          ability: authResult.ability,
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
                adminTokenId: authResult.credentials.id,
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

      sendJsonRpcError(res, 'INTERNAL_ERROR');
    }
  };
};
