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
  let mockUser: { id: number };
  let toolDefinitions: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>;
  let promptDefinitions: McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>;
  let resourceDefinitions: McpCapabilityDefinitionRegistry<
    'resource',
    Modules.MCP.McpResourceDefinition
  >;

  beforeEach(() => {
    mockStrapi = {
      log: {
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      },
      telemetry: {
        send: jest.fn().mockResolvedValue(true),
      },
    } as Core.Strapi;
    mockAbility = { can: jest.fn(() => false) };
    mockUser = { id: 1 };
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
      user: mockUser,
    });

    expect(result.mcpServer).toBeDefined();
    expect(result.registries.tools).toBeDefined();
    expect(result.registries.prompts).toBeDefined();
    expect(result.registries.resources).toBeDefined();
  });

  test('should enable devModeOnly capabilities when in dev mode', () => {
    // Add a devModeOnly tool
    toolDefinitions.define({
      name: 'dev-tool',
      title: 'Dev Tool',
      description: 'A dev-only tool',
      devModeOnly: true,
      resolveInputSchema: () => undefined,
      resolveOutputSchema: () => z.object({}),
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
      user: mockUser,
    });

    // The tool should be enabled
    const enabledTools = result.registries.tools.list({ filter: { status: ['enabled'] } });
    expect(enabledTools.some((t) => t.name === 'dev-tool')).toBe(true);
  });

  test('should not enable devModeOnly capabilities when not in dev mode', () => {
    // Add a devModeOnly tool
    toolDefinitions.define({
      name: 'dev-tool',
      title: 'Dev Tool',
      description: 'A dev-only tool',
      devModeOnly: true,
      resolveInputSchema: () => undefined,
      resolveOutputSchema: () => z.object({}),
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
      user: mockUser,
    });

    // The tool should remain disabled
    const disabledTools = result.registries.tools.list({
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
      user: mockUser,
    });

    expect(result.registries.tools.list().length).toBe(0);
    expect(result.registries.prompts.list().length).toBe(0);
    expect(result.registries.resources.list().length).toBe(0);
  });

  test('should enable auth-gated capabilities when action is allowed', () => {
    mockAbility.can.mockReturnValue(true);
    toolDefinitions.define({
      name: 'authorized-tool',
      title: 'Authorized Tool',
      description: 'An authorized tool',
      auth: { policies: [{ action: 'admin::read' }] },
      resolveInputSchema: () => undefined,
      resolveOutputSchema: () => z.object({}),
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
      user: mockUser,
    });

    expect(result.registries.tools.status('authorized-tool')).toBe('enabled');
    expect(mockAbility.can).toHaveBeenCalledWith('admin::read');
  });

  test('should keep auth-gated capabilities disabled when action is denied', () => {
    mockAbility.can.mockReturnValue(false);
    toolDefinitions.define({
      name: 'unauthorized-tool',
      title: 'Unauthorized Tool',
      description: 'An unauthorized tool',
      auth: { policies: [{ action: 'admin::read' }] },
      resolveInputSchema: () => undefined,
      resolveOutputSchema: () => z.object({}),
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
      user: mockUser,
    });

    expect(result.registries.tools.status('unauthorized-tool')).toBe('disabled');
  });

  test('should register and bind a tool with no resolveInputSchema', () => {
    mockAbility.can.mockReturnValue(true);
    toolDefinitions.define({
      name: 'no-input-tool',
      title: 'No Input Tool',
      description: 'A tool with no input schema',
      devModeOnly: true,
      resolveOutputSchema: () => z.object({ ok: z.boolean() }),
      createHandler: () => async () => ({ content: [], structuredContent: { ok: true } }),
    });

    expect(() => {
      createMcpServerWithRegistries({
        strapi: mockStrapi as Core.Strapi,
        definitions: {
          tools: toolDefinitions,
          prompts: promptDefinitions,
          resources: resourceDefinitions,
        },
        isDevMode: true,
        ability: mockAbility,
        user: mockUser,
      });
    }).not.toThrow();
  });

  test('should pass auth subject when checking capabilities', () => {
    mockAbility.can.mockReturnValue(true);
    resourceDefinitions.define({
      name: 'authorized-resource',
      uri: 'strapi://authorized-resource',
      metadata: {},
      auth: { policies: [{ action: 'admin::read', subject: 'api::article.article' }] },
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
      user: mockUser,
    });

    expect(mockAbility.can).toHaveBeenCalledWith('admin::read', 'api::article.article');
  });
});
