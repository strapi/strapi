// eslint-disable-next-line import/extensions
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';
import { McpPromptRegistry } from '../prompt-registry';
import { McpResourceRegistry } from '../resource-registry';
import { McpToolRegistry } from '../tool-registry';
import { McpCapabilityDefinitionRegistry } from './McpCapabilityDefinitionRegistry';

/**
 * CASL Ability interface for permission checking
 * Matches the signature from @casl/ability
 */
export interface Ability {
  can(action: string, subject?: any, field?: string): boolean;
}

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
  authResult?: { ability: Ability };
};

export const createMcpServerWithRegistries = ({
  strapi,
  definitions,
  isDevMode,
  authResult,
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

  // Bootstrap registries with current definitions (now includes dynamic tools)
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

  // Enable capabilities based on permissions and dev mode
  toolRegistry.list().forEach((toolDef) => {
    // Check dev mode requirement
    const shouldEnableDevMode = toolDef.devModeOnly === true && isDevMode === true;

    // Check permission requirements for tools with auth config
    let shouldEnableAuth = false;
    if (toolDef.auth?.actions && authResult?.ability) {
      // Check if ability permits all required actions
      // For content type permissions, also check subject
      shouldEnableAuth = toolDef.auth.actions.every((action: string) => {
        if (toolDef.auth?.subject) {
          return authResult.ability.can(action, toolDef.auth.subject);
        }
        return authResult.ability.can(action);
      });
    }

    if (shouldEnableDevMode || shouldEnableAuth) {
      toolRegistry.enable(toolDef.name);
    }
  });

  // Apply same logic to prompts
  promptRegistry.list().forEach((promptDef) => {
    const shouldEnableDevMode = promptDef.devModeOnly === true && isDevMode === true;
    let shouldEnableAuth = false;

    if (promptDef.auth?.actions && authResult?.ability) {
      shouldEnableAuth = promptDef.auth.actions.every((action: string) => {
        if (promptDef.auth?.subject) {
          return authResult.ability.can(action, promptDef.auth.subject);
        }
        return authResult.ability.can(action);
      });
    }

    if (shouldEnableDevMode || shouldEnableAuth) {
      promptRegistry.enable(promptDef.name);
    }
  });

  // Apply same logic to resources
  resourceRegistry.list().forEach((resourceDef) => {
    const shouldEnableDevMode = resourceDef.devModeOnly === true && isDevMode === true;
    let shouldEnableAuth = false;

    if (resourceDef.auth?.actions && authResult?.ability) {
      shouldEnableAuth = resourceDef.auth.actions.every((action: string) => {
        if (resourceDef.auth?.subject) {
          return authResult.ability.can(action, resourceDef.auth.subject);
        }
        return authResult.ability.can(action);
      });
    }

    if (shouldEnableDevMode || shouldEnableAuth) {
      resourceRegistry.enable(resourceDef.name);
    }
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
