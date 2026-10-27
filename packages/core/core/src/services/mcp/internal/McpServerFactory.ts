import { McpServer, type ServerCapabilities } from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';
import { McpPromptRegistry } from '../prompt-registry';
import { McpResourceRegistry } from '../resource-registry';
import { McpToolRegistry } from '../tool-registry';
import type { McpAdminTokenAbility } from '../authentication';
import { McpCapabilityDefinitionRegistry } from './McpCapabilityDefinitionRegistry';
import type { McpCapabilityRegistryReadonly } from './McpCapabilityRegistry';
import { canUseMcpCapability, syncMcpSessionCapabilities } from './syncMcpSessionCapabilities';
import type { McpToolSchemaScope } from './resolveToolSchemaScope';

export type McpCapabilityDefinitions = {
  tools: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>;
  prompts: McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>;
  resources: McpCapabilityDefinitionRegistry<'resource', Modules.MCP.McpResourceDefinition>;
};

export type McpRegistries = {
  tools: McpToolRegistry;
  prompts: McpPromptRegistry;
  resources: McpResourceRegistry;
};

/** Read-only registry surface exposed on McpServerWithRegistries. */
export type McpRegistriesReadonly = {
  tools: McpCapabilityRegistryReadonly;
  prompts: McpCapabilityRegistryReadonly;
  resources: McpCapabilityRegistryReadonly;
};

export type McpServerWithRegistries = {
  mcpServer: McpServer;
  registries: McpRegistriesReadonly;
};

export type CreateMcpServerWithRegistriesParams = {
  strapi: Core.Strapi;
  definitions: McpCapabilityDefinitions;
  isDevMode: boolean;
  ability: McpAdminTokenAbility;
  user: Modules.MCP.McpHandlerContext['user'];
  /** Tools whose schemas the request needs. Defaults to `'all'`. */
  toolSchemaScope?: McpToolSchemaScope;
  /** Passed to the SDK as `maxToolInputElements`. */
  maxToolInputElements?: number;
};

export const createMcpServerWithRegistries = ({
  strapi,
  definitions,
  isDevMode,
  ability,
  user,
  toolSchemaScope = 'all',
  maxToolInputElements,
}: CreateMcpServerWithRegistriesParams): McpServerWithRegistries => {
  const capabilities: ServerCapabilities = {
    logging: {},
  };
  // Advertise capability categories when definitions exist (server-level), not per-user enabled
  // count. Clients discover the real set via tools/list, prompts/list, resources/list after sync.
  if (definitions.tools.size > 0) {
    capabilities.tools = {};
  }
  if (definitions.prompts.size > 0) {
    capabilities.prompts = {};
  }
  if (definitions.resources.size > 0) {
    capabilities.resources = {};
  }

  const mcpServer = new McpServer(
    {
      name: 'strapi-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities,
      maxToolInputElements,
    }
  );

  // Bootstrap registries with current definitions
  const tools = new McpToolRegistry({
    strapi,
    definitions: definitions.tools,
    ability,
    user,
    // A tool the token cannot use stays disabled, so its schemas are never advertised nor used.
    shouldResolveSchemas: (definition) =>
      (toolSchemaScope === 'all' || toolSchemaScope.has(definition.name)) &&
      canUseMcpCapability({ ability, definition, isDevMode }),
  });
  const prompts = new McpPromptRegistry({
    strapi,
    definitions: definitions.prompts,
  });
  const resources = new McpResourceRegistry({
    strapi,
    definitions: definitions.resources,
  });

  // Register capabilities (disabled by default)
  tools.bind(mcpServer);
  prompts.bind(mcpServer);
  resources.bind(mcpServer);

  syncMcpSessionCapabilities({
    registries: {
      tools,
      prompts,
      resources,
    },
    definitions,
    ability,
    isDevMode,
  });

  return {
    mcpServer,
    registries: {
      tools,
      prompts,
      resources,
    },
  };
};
