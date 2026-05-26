// eslint-disable-next-line import/extensions
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Core } from '@strapi/types';
import { createMcpMetrics } from '../metrics';
import { sendJsonRpcError } from '../utils/sendJsonRpcError';
import { withTimeout } from '../utils/withTimeout';
import type { McpHandlerDependencies } from './types';

export const createPostHandler = (deps: McpHandlerDependencies): Core.MiddlewareHandler => {
  const {
    strapi,
    authenticationStrategy,
    config,
    createServerWithRegistries,
    capabilityDefinitions,
  } = deps;

  return async (ctx) => {
    // Opt out of Koa's response phase — the MCP SDK writes directly to ctx.res
    // (via res.writeHead / res.end / SSE streaming). Without this, Koa's respond()
    // would also try to write ctx.body to the socket after the handler returns.
    ctx.respond = false;
    const req = ctx.req;
    const res = ctx.res;

    const metrics = createMcpMetrics(strapi);

    try {
      const authResult = await authenticationStrategy.authenticate(ctx);
      if (authResult.authenticated === false) {
        metrics.send('didNotAuthenticateMcpRequest', {
          errorClass: authResult.error?.constructor.name ?? 'unknown',
        });
        sendJsonRpcError(res, 'AUTHENTICATION_REQUIRED');
        return;
      }

      metrics.send('didAuthenticateMcpRequest');

      const { mcpServer } = createServerWithRegistries({
        strapi,
        definitions: capabilityDefinitions,
        isDevMode: config.isDevMode(),
        ability: authResult.ability,
        user: authResult.user,
      });

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      try {
        await withTimeout(
          mcpServer.connect(transport),
          config.connectTimeoutMs,
          'mcpServer.connect'
        );

        const requestBody = ctx.request.body ?? null;
        await withTimeout(
          transport.handleRequest(req, res, requestBody),
          config.requestTimeoutMs,
          'transport.handleRequest'
        );
      } finally {
        await mcpServer.close();
      }
    } catch (error) {
      metrics.send('didNotHandleMcpRequest', {
        errorClass: error instanceof Error ? error.constructor.name : 'unknown',
      });

      strapi.log.error('[MCP] Error handling POST request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      sendJsonRpcError(res, 'INTERNAL_ERROR');
    }
  };
};
