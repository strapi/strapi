import type { Core, Modules } from '@strapi/types';
import { createDeleteHandler } from './handlers/handleDelete';
import { createGetHandler } from './handlers/handleGet';
import { createPostHandler } from './handlers/handlePost';
import type { McpHandlerDependencies } from './handlers/types';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import { McpConfiguration } from './internal/McpConfiguration';
import { createMcpServerWithRegistries } from './internal/McpServerFactory';
import { McpSessionManager } from './internal/McpSessionManager';
import { createAppTokenStrategy } from './strategies/app-token';
import { logToolDefinition } from './tools/log';
import { listContentTypesToolDefinition } from './tools/list-content-types';
import { getContentTypeSchemaToolDefinition } from './tools/get-content-type-schema';
import { generateContentTypeTools } from './tools/content-type-tools';
import { createManagedInterval } from './utils/createManagedInterval';

/**
 * Handler for unsupported HTTP methods on /mcp endpoint.
 * Returns JSON-RPC error instead of plain text so MCP clients can parse it.
 */
const handleMethodNotAllowed: Core.MiddlewareHandler = async (ctx) => {
  ctx.status = 405;
  ctx.set('Allow', 'GET, POST, DELETE');
  ctx.set('Content-Type', 'application/json');
  ctx.body = {
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed' },
    id: null,
  };
};

/**
 * Handler for OAuth discovery endpoints.
 * Returns JSON 404 so MCP clients skip OAuth and use Bearer token auth.
 */
const handleOAuthNotSupported: Core.MiddlewareHandler = async (ctx) => {
  ctx.status = 404;
  ctx.set('Content-Type', 'application/json');
  ctx.body = { error: 'not_found', error_description: 'OAuth not supported' };
};

/**
 * Creates MCP route definitions for registration with Strapi server.
 * @internal
 */
export const createMcpRoutes = (
  config: McpConfiguration,
  handlers: {
    handlePost: Core.MiddlewareHandler;
    handleGet: Core.MiddlewareHandler;
    handleDelete: Core.MiddlewareHandler;
  }
): Omit<Core.Route, 'info'>[] => {
  const noAuth = { auth: false } as const;

  return [
    // Core MCP endpoints
    { method: 'POST', path: config.path, handler: handlers.handlePost, config: noAuth },
    { method: 'GET', path: config.path, handler: handlers.handleGet, config: noAuth },
    { method: 'DELETE', path: config.path, handler: handlers.handleDelete, config: noAuth },
    // Unsupported methods on /mcp - return JSON error for MCP client compatibility
    { method: 'PUT', path: config.path, handler: handleMethodNotAllowed, config: noAuth },
    { method: 'PATCH', path: config.path, handler: handleMethodNotAllowed, config: noAuth },
    // OAuth discovery endpoints - return 404 JSON so clients fall back to Bearer auth
    {
      method: 'GET',
      path: '/.well-known/oauth-authorization-server',
      handler: handleOAuthNotSupported,
      config: noAuth,
    },
    {
      method: 'POST',
      path: '/.well-known/oauth-authorization-server',
      handler: handleOAuthNotSupported,
      config: noAuth,
    },
    {
      method: 'PUT',
      path: '/.well-known/oauth-authorization-server',
      handler: handleOAuthNotSupported,
      config: noAuth,
    },
    {
      method: 'DELETE',
      path: '/.well-known/oauth-authorization-server',
      handler: handleOAuthNotSupported,
      config: noAuth,
    },
    {
      method: 'PATCH',
      path: '/.well-known/oauth-authorization-server',
      handler: handleOAuthNotSupported,
      config: noAuth,
    },
    /**
     * OAuth Dynamic Client Registration endpoint (RFC 7591).
     * Claude Code's MCP client probes this endpoint; without a JSON response,
     * Strapi returns plain text "Method Not Allowed" which breaks the client.
     */
    { method: 'POST', path: '/register', handler: handleOAuthNotSupported, config: noAuth },
  ];
};

/**
 * Creates a MCP service instance for Strapi Core
 */
export const createMcpService = (strapi: Core.Strapi): Modules.MCP.McpService => {
  // Create app-token strategy with injected Strapi instance
  const appTokenStrategy = createAppTokenStrategy(strapi);

  // Initialize configuration
  const config = new McpConfiguration(strapi);

  // Initialize session manager
  const sessionManager = new McpSessionManager(config, strapi);

  // Status tracking
  let serverStatus: Modules.MCP.McpServiceStatus = 'idle';

  // Cleanup interval management
  const cleanupSessionsInterval = createManagedInterval();

  // Definition registries
  const toolDefinitions = new McpCapabilityDefinitionRegistry<
    'tool',
    Modules.MCP.McpToolDefinition
  >('tool');

  const promptDefinitions = new McpCapabilityDefinitionRegistry<
    'prompt',
    Modules.MCP.McpPromptDefinition
  >('prompt');

  const resourceDefinitions = new McpCapabilityDefinitionRegistry<
    'resource',
    Modules.MCP.McpResourceDefinition
  >('resource');

  // Prepare handler dependencies
  const handlerDependencies: McpHandlerDependencies = {
    strapi,
    authenticationStrategy: appTokenStrategy,
    sessionManager,
    config,
    createServerWithRegistries: createMcpServerWithRegistries,
    capabilityDefinitions: {
      tools: toolDefinitions,
      prompts: promptDefinitions,
      resources: resourceDefinitions,
    },
  };

  // Create HTTP handlers
  const handlePost = createPostHandler(handlerDependencies);
  const handleGet = createGetHandler(handlerDependencies);
  const handleDelete = createDeleteHandler(handlerDependencies);

  const service: Modules.MCP.McpService = {
    isEnabled() {
      return config.isEnabled();
    },

    isRunning() {
      return serverStatus === 'running';
    },

    registerTool(tool) {
      if (serverStatus !== 'idle') {
        throw new Error(
          '[MCP] Tools must be registered before MCP server starts. Register during plugin register().'
        );
      }
      const { inputSchema, ...rest } = tool;
      toolDefinitions.define({
        ...rest,
        inputSchema,
      });
    },

    registerPrompt(prompt) {
      if (serverStatus !== 'idle') {
        throw new Error(
          '[MCP] Prompts must be registered before MCP server starts. Register during plugin register().'
        );
      }
      const { argsSchema, ...rest } = prompt;
      promptDefinitions.define({
        ...rest,
        argsSchema,
      });
    },

    registerResource(resource) {
      if (serverStatus !== 'idle') {
        throw new Error(
          '[MCP] Resources must be registered before MCP server starts. Register during plugin register().'
        );
      }
      resourceDefinitions.define(resource);
    },

    async start() {
      if (service.isEnabled() === false) {
        strapi.log.debug('[MCP] Server is disabled');
        return;
      }
      if (serverStatus === 'error') {
        throw new Error('[MCP] Cannot start server: previous error state');
      }
      if (serverStatus !== 'idle') {
        throw new Error(`[MCP] Server already started or starting (status: ${serverStatus})`);
      }
      serverStatus = 'starting';

      const routes = createMcpRoutes(config, { handlePost, handleGet, handleDelete });
      strapi.server.routes(routes);

      // Set status to 'running' after routes are registered
      serverStatus = 'running';

      // Start periodic cleanup of idle sessions
      cleanupSessionsInterval.start(() => {
        sessionManager.cleanupIdleSessions();
      }, config.cleanupIntervalMs);

      const baseUrl = strapi.config.get('server.url', 'http://localhost:1337');
      strapi.log.info(`[MCP] Server available at ${baseUrl}${config.path}`);
    },

    async stop() {
      serverStatus = 'stopping';

      try {
        const { erroredSessionMessages, hasErrors } = await sessionManager.closeAllSessions();

        // Log any errors encountered during session closures
        if (hasErrors === true) {
          strapi.log.error(
            `[MCP] Errors occurred while stopping sessions:\n${erroredSessionMessages.join('\n')}`
          );
          serverStatus = 'error';
        } else {
          serverStatus = 'idle';
        }
      } catch (error) {
        strapi.log.error('[MCP] Error stopping service', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        serverStatus = 'error';
      } finally {
        // Clear cleanup interval
        cleanupSessionsInterval.clear();

        strapi.log.info('[MCP] Service stopped');
      }
    },
  };

  service.registerTool(logToolDefinition);

  service.registerTool(listContentTypesToolDefinition);

  service.registerTool(getContentTypeSchemaToolDefinition);

  // Generate and register content type tools
  const contentTypeTools = generateContentTypeTools({ strapi });
  contentTypeTools.forEach((tool) => {
    service.registerTool(
      // @ts-expect-error - tool variance conflict
      tool
    );
  });

  return service;
};
