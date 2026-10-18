import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';
import type { ServerContext } from '@modelcontextprotocol/server';
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

const mockServerContext = {
  sessionId: 'test-session-id',
  mcpReq: {
    id: 'test-request-id',
    method: 'tools/call',
    signal: new AbortController().signal,
    _meta: { ordinary: 'metadata' },
    envelope: { 'io.modelcontextprotocol/protocol-version': '2026-07-28' },
    requestState: () => undefined,
    send: jest.fn(),
    notify: jest.fn(),
    log: jest.fn(),
    elicitInput: jest.fn(),
    requestSampling: jest.fn(),
  },
  http: {
    authInfo: {
      token: 'test-token',
      clientId: 'test-client',
      scopes: ['mcp'],
    },
    req: new Request('https://example.com/mcp', {
      headers: { authorization: 'Bearer test-token', 'x-request-id': 'http-request-id' },
    }),
  },
} satisfies ServerContext;

const expectedHandlerContext: Modules.MCP.McpCapabilityHandlerContext = {
  signal: mockServerContext.mcpReq.signal,
  requestId: 'test-request-id',
  sessionId: 'test-session-id',
  authInfo: mockServerContext.http.authInfo,
  _meta: {
    ordinary: 'metadata',
    'io.modelcontextprotocol/protocol-version': '2026-07-28',
  },
  requestInfo: {
    headers: {
      authorization: 'Bearer test-token',
      'x-request-id': 'http-request-id',
    },
    url: new URL('https://example.com/mcp'),
  },
};

const mockServerContextWithoutHttp = {
  mcpReq: {
    ...mockServerContext.mcpReq,
    _meta: undefined,
    envelope: undefined,
  },
} satisfies ServerContext;

const expectedHandlerContextWithoutHttp: Modules.MCP.McpCapabilityHandlerContext = {
  signal: mockServerContext.mcpReq.signal,
  requestId: 'test-request-id',
  sessionId: undefined,
  authInfo: undefined,
  _meta: undefined,
  requestInfo: undefined,
};

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/server', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool: jest.fn(() => new MockRegisteredCapability()),
    registerPrompt: jest.fn(() => new MockRegisteredCapability()),
    registerResource: jest.fn(() => new MockRegisteredCapability()),
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

  test('should adapt input tool callbacks to the Strapi handler shape', async () => {
    const handler = jest.fn().mockResolvedValue({
      content: [],
      structuredContent: { value: 'input' },
    });
    toolDefinitions.define({
      name: 'input-tool',
      title: 'Input Tool',
      description: 'A tool with an input schema',
      devModeOnly: true,
      resolveInputSchema: () => z.object({ value: z.string() }),
      resolveOutputSchema: () => z.object({ value: z.string() }),
      createHandler: () => handler,
    });

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

    const { McpServer } = jest.requireMock('@modelcontextprotocol/server');
    const sdkHandler = McpServer.mock.results.at(-1).value.registerTool.mock.calls[0][2];
    await sdkHandler({ value: 'input' }, mockServerContext);

    expect(handler).toHaveBeenCalledWith({
      args: { value: 'input' },
      extra: expectedHandlerContext,
    });
  });

  test('should adapt no-input tool callbacks to the Strapi handler shape', async () => {
    const handler = jest.fn().mockResolvedValue({
      content: [],
      structuredContent: { ok: true },
    });
    toolDefinitions.define({
      name: 'no-input-tool',
      title: 'No Input Tool',
      description: 'A tool without an input schema',
      devModeOnly: true,
      resolveOutputSchema: () => z.object({ ok: z.boolean() }),
      createHandler: () => handler,
    });

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

    const { McpServer } = jest.requireMock('@modelcontextprotocol/server');
    const sdkHandler = McpServer.mock.results.at(-1).value.registerTool.mock.calls[0][2];
    await sdkHandler(mockServerContextWithoutHttp);

    expect(handler).toHaveBeenCalledWith({ extra: expectedHandlerContextWithoutHttp });
  });

  test('should translate the same handler context for prompts', async () => {
    const handler = jest.fn().mockResolvedValue({ messages: [] });
    promptDefinitions.define({
      name: 'context-prompt',
      title: 'Context Prompt',
      description: 'A prompt that observes request context',
      devModeOnly: true,
      createHandler: () => handler,
    });

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

    const { McpServer } = jest.requireMock('@modelcontextprotocol/server');
    const sdkHandler = McpServer.mock.results.at(-1).value.registerPrompt.mock.calls[0][2];
    await sdkHandler(mockServerContext);

    expect(handler).toHaveBeenCalledWith(expectedHandlerContext);
  });

  test('should preserve prompt arguments while translating the handler context', async () => {
    const handler = jest.fn().mockResolvedValue({ messages: [] });
    promptDefinitions.define({
      name: 'args-context-prompt',
      title: 'Arguments Context Prompt',
      description: 'A prompt that observes arguments and request context',
      argsSchema: z.object({ topic: z.string() }),
      devModeOnly: true,
      createHandler: () => handler,
    });

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

    const { McpServer } = jest.requireMock('@modelcontextprotocol/server');
    const sdkHandler = McpServer.mock.results.at(-1).value.registerPrompt.mock.calls[0][2];
    await sdkHandler({ topic: 'Strapi' }, mockServerContext);

    expect(handler).toHaveBeenCalledWith({ topic: 'Strapi' }, expectedHandlerContext);
  });

  test('should translate the same handler context for resources', async () => {
    const handler = jest.fn().mockResolvedValue({ contents: [] });
    resourceDefinitions.define({
      name: 'context-resource',
      uri: 'strapi://context',
      metadata: {},
      devModeOnly: true,
      createHandler: () => handler,
    });

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

    const { McpServer } = jest.requireMock('@modelcontextprotocol/server');
    const sdkHandler = McpServer.mock.results.at(-1).value.registerResource.mock.calls[0][3];
    const uri = new URL('strapi://context');
    await sdkHandler(uri, mockServerContext);

    expect(handler).toHaveBeenCalledWith(uri, expectedHandlerContext);
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
