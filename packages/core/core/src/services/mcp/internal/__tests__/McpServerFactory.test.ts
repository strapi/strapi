import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';
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
  let mockAbility: { can: jest.Mock };
  let toolDefinitions: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>;
  let promptDefinitions: McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>;
  let resourceDefinitions: McpCapabilityDefinitionRegistry<
    'resource',
    Modules.MCP.McpResourceDefinition
  >;

  beforeEach(() => {
    mockStrapi = {} as Core.Strapi;
    mockAbility = { can: jest.fn(() => false) };
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
      ability: mockAbility,
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
      ability: mockAbility,
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
      ability: mockAbility,
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
      ability: mockAbility,
    });

    expect(result.registries.toolRegistry.list().length).toBe(0);
    expect(result.registries.promptRegistry.list().length).toBe(0);
    expect(result.registries.resourceRegistry.list().length).toBe(0);
  });

  test('should enable auth-gated capabilities when action is allowed', () => {
    mockAbility.can.mockReturnValue(true);
    toolDefinitions.define({
      name: 'authorized-tool',
      title: 'Authorized Tool',
      description: 'An authorized tool',
      auth: { action: 'admin::read' },
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
      ability: mockAbility,
    });

    expect(result.registries.toolRegistry.status('authorized-tool')).toBe('enabled');
    expect(mockAbility.can).toHaveBeenCalledWith('admin::read');
  });

  test('should keep auth-gated capabilities disabled when action is denied', () => {
    mockAbility.can.mockReturnValue(false);
    toolDefinitions.define({
      name: 'unauthorized-tool',
      title: 'Unauthorized Tool',
      description: 'An unauthorized tool',
      auth: { action: 'admin::read' },
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
      ability: mockAbility,
    });

    expect(result.registries.toolRegistry.status('unauthorized-tool')).toBe('disabled');
  });

  test('should pass auth subject when checking capabilities', () => {
    mockAbility.can.mockReturnValue(true);
    resourceDefinitions.define({
      name: 'authorized-resource',
      uri: 'strapi://authorized-resource',
      metadata: {},
      auth: { action: 'admin::read', subject: 'api::article.article' },
      createHandler: () => async () => ({ contents: [] }),
    });

    createMcpServerWithRegistries({
      strapi: mockStrapi as Core.Strapi,
      definitions: {
        tools: toolDefinitions,
        prompts: promptDefinitions,
        resources: resourceDefinitions,
      },
      isDevMode: false,
      ability: mockAbility,
    });

    expect(mockAbility.can).toHaveBeenCalledWith('admin::read', 'api::article.article');
  });
});
