// eslint-disable-next-line import/extensions
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Core } from '@strapi/types';
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
    const req = ctx.req;
    const res = ctx.res;

    try {
      const authResult = await authenticationStrategy.authenticate(ctx);
      if (authResult.authenticated === false) {
        sendJsonRpcError(res, 'AUTHENTICATION_REQUIRED');
        return;
      }

      const { mcpServer } = createServerWithRegistries({
        strapi,
        definitions: capabilityDefinitions,
        isDevMode: config.isDevMode(),
        ability: authResult.ability,
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
      strapi.log.error('[MCP] Error handling POST request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      sendJsonRpcError(res, 'INTERNAL_ERROR');
    }
  };
};
