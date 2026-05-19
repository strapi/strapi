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
  tools: McpToolRegistry;
  prompts: McpPromptRegistry;
  resources: McpResourceRegistry;
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
  user: Modules.MCP.McpHandlerContext['user'];
};

export const createMcpServerWithRegistries = ({
  strapi,
  definitions,
  isDevMode,
  ability,
  user,
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
  const tools = new McpToolRegistry({
    strapi,
    definitions: definitions.tools,
    ability,
    user,
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
