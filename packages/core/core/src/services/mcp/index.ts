import type { Core, Modules } from '@strapi/types';
import { createMcpAdminTokenAuthenticator } from './authentication';
import { createPostHandler } from './handlers/handlePost';
import type { McpHandlerDependencies } from './handlers/types';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import { McpConfiguration } from './internal/McpConfiguration';
import { createMcpServerWithRegistries } from './internal/McpServerFactory';
import { createOAuthDiscoveryFallbackMiddleware } from './middleware/oauthDiscoveryFallback';
import { createMcpRoutes } from './routes';
import { logToolDefinition } from './tools/log';

/**
 * Creates an MCP service instance for Strapi Core
 */
export const createMcpService = (strapi: Core.Strapi): Modules.MCP.McpService => {
  // Initialize configuration
  const config = new McpConfiguration(strapi);

  const authenticationStrategy = createMcpAdminTokenAuthenticator(strapi);

  // Status tracking
  let serverStatus: Modules.MCP.McpServiceStatus = 'idle';

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
    authenticationStrategy,
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

  const service: Modules.MCP.McpService = {
    isEnabled() {
      return config.isEnabled();
    },

    isRunning() {
      return serverStatus === 'running';
    },

    registerTool(tool: Modules.MCP.McpToolDefinition) {
      if (serverStatus !== 'idle') {
        throw new Error('[MCP] Cannot register tools after the MCP server has started.');
      }

      toolDefinitions.define(tool);
    },

    registerPrompt(prompt) {
      if (serverStatus !== 'idle') {
        throw new Error('[MCP] Cannot register prompts after the MCP server has started.');
      }
      promptDefinitions.define(prompt);
    },

    registerResource(resource) {
      if (serverStatus !== 'idle') {
        throw new Error('[MCP] Cannot register resources after the MCP server has started.');
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

      strapi.server.use(createOAuthDiscoveryFallbackMiddleware());

      const routes = createMcpRoutes(config, { handlePost });
      strapi.server.routes(routes);

      serverStatus = 'running';

      const baseUrl = strapi.config.get('server.url', 'http://localhost:1337');
      strapi.log.info(`[MCP] Server available at ${baseUrl}${config.path}`);
    },

    async stop() {
      serverStatus = 'idle';
      strapi.log.info('[MCP] Service stopped');
    },
  };

  service.registerTool(logToolDefinition);

  return service;
};
