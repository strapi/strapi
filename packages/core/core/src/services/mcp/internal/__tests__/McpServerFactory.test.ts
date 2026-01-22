import type { Core, Modules } from '@strapi/types';
import * as z from 'zod';
import type { RegisteredCapability } from '../McpCapabilityRegistry';
import { McpCapabilityDefinitionRegistry } from '../McpCapabilityDefinitionRegistry';
import { createMcpServerWithRegistries } from '../McpServerFactory';

// Mock registered capability for testing
class MockRegisteredCapability implements RegisteredCapability {
  enabled: boolean = false;

  enable = jest.fn(() => {
    this.enabled = true;
  });

  disable = jest.fn(() => {
    this.enabled = false;
  });

  remove = jest.fn();
}

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool() {
      return new MockRegisteredCapability();
    },
    registerPrompt() {
      return new MockRegisteredCapability();
    },
    registerResource() {
      return new MockRegisteredCapability();
    },
  })),
}));

describe('createMcpServerWithRegistries', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let toolDefinitions: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>;
  let promptDefinitions: McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>;
  let resourceDefinitions: McpCapabilityDefinitionRegistry<
    'resource',
    Modules.MCP.McpResourceDefinition
  >;

  beforeEach(() => {
    mockStrapi = {} as Core.Strapi;
    toolDefinitions = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
      'tool'
    );
    promptDefinitions = new McpCapabilityDefinitionRegistry<
      'prompt',
      Modules.MCP.McpPromptDefinition
    >('prompt');
    resourceDefinitions = new McpCapabilityDefinitionRegistry<
      'resource',
      Modules.MCP.McpResourceDefinition
    >('resource');
  });

  test('should create MCP server with registries', () => {
    const result = createMcpServerWithRegistries({
      strapi: mockStrapi as Core.Strapi,
      definitions: {
        tools: toolDefinitions,
        prompts: promptDefinitions,
        resources: resourceDefinitions,
      },
      isDevMode: false,
    });

    expect(result.mcpServer).toBeDefined();
    expect(result.registries.toolRegistry).toBeDefined();
    expect(result.registries.promptRegistry).toBeDefined();
    expect(result.registries.resourceRegistry).toBeDefined();
  });

  test('should enable devModeOnly capabilities when in dev mode', () => {
    // Add a devModeOnly tool
    toolDefinitions.define({
      name: 'dev-tool',
      title: 'Dev Tool',
      description: 'A dev-only tool',
      devModeOnly: true,
      inputSchema: undefined,
      outputSchema: z.object({}),
      createHandler: () => async () => ({ content: [], structuredContent: {} }),
    });

    const result = createMcpServerWithRegistries({
      strapi: mockStrapi as Core.Strapi,
      definitions: {
        tools: toolDefinitions,
        prompts: promptDefinitions,
        resources: resourceDefinitions,
      },
      isDevMode: true,
    });

    // The tool should be enabled
    const enabledTools = result.registries.toolRegistry.list({ filter: { status: ['enabled'] } });
    expect(enabledTools.some((t) => t.name === 'dev-tool')).toBe(true);
  });

  test('should not enable devModeOnly capabilities when not in dev mode', () => {
    // Add a devModeOnly tool
    toolDefinitions.define({
      name: 'dev-tool',
      title: 'Dev Tool',
      description: 'A dev-only tool',
      devModeOnly: true,
      inputSchema: undefined,
      outputSchema: z.object({}),
      createHandler: () => async () => ({ content: [], structuredContent: {} }),
    });

    const result = createMcpServerWithRegistries({
      strapi: mockStrapi as Core.Strapi,
      definitions: {
        tools: toolDefinitions,
        prompts: promptDefinitions,
        resources: resourceDefinitions,
      },
      isDevMode: false,
    });

    // The tool should remain disabled
    const disabledTools = result.registries.toolRegistry.list({
      filter: { status: ['disabled'] },
    });
    expect(disabledTools.some((t) => t.name === 'dev-tool')).toBe(true);
  });

  test('should handle empty definitions', () => {
    const result = createMcpServerWithRegistries({
      strapi: mockStrapi as Core.Strapi,
      definitions: {
        tools: toolDefinitions,
        prompts: promptDefinitions,
        resources: resourceDefinitions,
      },
      isDevMode: false,
    });

    expect(result.registries.toolRegistry.list().length).toBe(0);
    expect(result.registries.promptRegistry.list().length).toBe(0);
    expect(result.registries.resourceRegistry.list().length).toBe(0);
  });
});
