// eslint-disable-next-line import/extensions
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';
import { McpPromptRegistry } from '../prompt-registry';
import { McpResourceRegistry } from '../resource-registry';
import { McpToolRegistry } from '../tool-registry';
import type { McpAdminTokenAbility } from '../authentication';
import { McpCapabilityDefinitionRegistry } from './McpCapabilityDefinitionRegistry';
import { syncMcpSessionCapabilities } from './syncMcpSessionCapabilities';

export type McpCapabilityDefinitions = {
  tools: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>;
  prompts: McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>;
  resources: McpCapabilityDefinitionRegistry<'resource', Modules.MCP.McpResourceDefinition>;
};

export type McpRegistries = {
  toolRegistry: McpToolRegistry;
  promptRegistry: McpPromptRegistry;
  resourceRegistry: McpResourceRegistry;
};

export type McpServerWithRegistries = {
  mcpServer: McpServer;
  registries: McpRegistries;
};

export type CreateMcpServerWithRegistriesParams = {
  strapi: Core.Strapi;
  definitions: McpCapabilityDefinitions;
  isDevMode: boolean;
  ability: McpAdminTokenAbility;
};

export const createMcpServerWithRegistries = ({
  strapi,
  definitions,
  isDevMode,
  ability,
}: CreateMcpServerWithRegistriesParams): McpServerWithRegistries => {
  const capabilities: {
    logging?: Record<string, unknown>;
    tools?: Record<string, unknown>;
    prompts?: Record<string, unknown>;
    resources?: Record<string, unknown>;
  } = {
    logging: {},
  };
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
    }
  );

  // Bootstrap registries with current definitions
  const toolRegistry = new McpToolRegistry({
    strapi,
    definitions: definitions.tools,
  });
  const promptRegistry = new McpPromptRegistry({
    strapi,
    definitions: definitions.prompts,
  });
  const resourceRegistry = new McpResourceRegistry({
    strapi,
    definitions: definitions.resources,
  });

  // Register capabilities (disabled by default)
  toolRegistry.bind(mcpServer);
  promptRegistry.bind(mcpServer);
  resourceRegistry.bind(mcpServer);

  syncMcpSessionCapabilities({
    session: {
      toolRegistry,
      promptRegistry,
      resourceRegistry,
    },
    definitions,
    ability,
    isDevMode,
  });

  return {
    mcpServer,
    registries: {
      toolRegistry,
      promptRegistry,
      resourceRegistry,
    },
  };
};
