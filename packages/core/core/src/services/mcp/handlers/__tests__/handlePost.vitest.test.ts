import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import * as mcpNodeSdk from '@modelcontextprotocol/node';
import type { Core } from '@strapi/types';
import { IncomingMessage, ServerResponse } from 'node:http';
import { McpConfiguration } from '../../internal/McpConfiguration';
import { JSON_RPC_ERRORS } from '../../utils/jsonRpcErrors';
import { createPostHandler } from '../handlePost';
import type { McpHandlerDependencies } from '../types';

import { withTimeout } from '../../utils/withTimeout';
import {
  sendDidNotAuthenticateMcpRequest,
  sendDidNotHandleMcpRequest,
  sendDidUseMcpServer,
} from '../../metrics/metrics';

vi.mock('../../utils/withTimeout', () => ({
  withTimeout: vi.fn((promise) => promise),
}));

vi.mock('../../metrics/metrics', async (importOriginal) => ({
  sendDidUseMcpServer: vi.fn(),
  sendDidNotAuthenticateMcpRequest: vi.fn(),
  sendDidNotHandleMcpRequest: vi.fn(),
  classifyMcpRequestFailure: (await importOriginal<typeof import('../../metrics/metrics')>())
    .classifyMcpRequestFailure,
}));

vi.mock('@modelcontextprotocol/node', () => ({
  NodeStreamableHTTPServerTransport: vi.fn(),
}));

describe('handlePost', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let mockConfig: McpConfiguration;
  let mockAuthenticationStrategy: McpHandlerDependencies['authenticationStrategy'];
  let logErrorSpy: Mock;
  let logInfoSpy: Mock;

  beforeEach(() => {
    logErrorSpy = vi.fn();
    logInfoSpy = vi.fn();
    vi.mocked(sendDidUseMcpServer).mockClear();
    vi.mocked(sendDidNotAuthenticateMcpRequest).mockClear();
    vi.mocked(sendDidNotHandleMcpRequest).mockClear();
    mockStrapi = {
      log: {
        error: logErrorSpy,
        info: logInfoSpy,
      } as any,
      config: {
        get: vi.fn((key, defaultValue) => defaultValue),
      } as any,
    };
    mockConfig = new McpConfiguration(mockStrapi as Core.Strapi);
    mockAuthenticationStrategy = {
      authenticate: vi.fn().mockResolvedValue({
        // Distinct ids so assertions can tell the token owner (user) apart
        // from the token itself (credentials).
        authenticated: true,
        credentials: { id: 7 },
        user: { id: 42 },
        ability: { can: vi.fn(() => true) },
      }),
    };
  });

  const makeCtx = (req: IncomingMessage, res: ServerResponse, body?: unknown) =>
    ({ req, res, request: { body }, respond: true, state: {} }) as any;

  const makeRes = () => {
    const writeHeadSpy = vi.fn();
    const endSpy = vi.fn();
    const res = {
      headersSent: false,
      writeHead: writeHeadSpy,
      end: endSpy,
    } as unknown as ServerResponse;
    return { res, writeHeadSpy, endSpy };
  };

  const makeReq = () => ({ headers: {} }) as unknown as IncomingMessage;

  test('should set ctx.respond = false before touching the response', async () => {
    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      config: mockConfig,
      createServerWithRegistries: vi.fn().mockReturnValue({
        mcpServer: {
          connect: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        },
        registries: {},
      }),
      capabilityDefinitions: {} as any,
    };

    const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
    NodeStreamableHTTPServerTransport.mockImplementation(function MockTransport() {
      return {
        handleRequest: vi.fn().mockResolvedValue(undefined),
      };
    });

    const handler = createPostHandler(deps);
    const ctx = makeCtx(makeReq(), { headersSent: false } as unknown as ServerResponse);

    await handler(ctx, () => Promise.resolve());

    expect(ctx.respond).toBe(false);
  });

  test('should return AUTHENTICATION_REQUIRED when authentication fails', async () => {
    mockAuthenticationStrategy.authenticate = vi.fn().mockResolvedValue({
      authenticated: false,
      reason: 'invalid_token',
    });

    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      config: mockConfig,
      createServerWithRegistries: vi.fn(),
      capabilityDefinitions: {} as any,
    };

    const handler = createPostHandler(deps);
    const { res, writeHeadSpy, endSpy } = makeRes();
    const ctx = makeCtx(makeReq(), res);

    await handler(ctx, () => Promise.resolve());

    expect(ctx.respond).toBe(false);
    expect(writeHeadSpy).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.AUTHENTICATION_REQUIRED.code,
          message: JSON_RPC_ERRORS.AUTHENTICATION_REQUIRED.message,
        },
        id: null,
      })
    );
    expect(sendDidUseMcpServer).not.toHaveBeenCalled();
    expect(sendDidNotAuthenticateMcpRequest).toHaveBeenCalledWith(mockStrapi, 'invalid_token');
    expect(sendDidNotHandleMcpRequest).not.toHaveBeenCalled();
  });

  test('should record missing_token auth failure telemetry', async () => {
    mockAuthenticationStrategy.authenticate = vi.fn().mockResolvedValue({
      authenticated: false,
      reason: 'missing_token',
    });

    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      config: mockConfig,
      createServerWithRegistries: vi.fn(),
      capabilityDefinitions: {} as any,
    };

    const handler = createPostHandler(deps);
    const { res } = makeRes();
    const ctx = makeCtx(makeReq(), res);

    await handler(ctx, () => Promise.resolve());

    expect(sendDidNotAuthenticateMcpRequest).toHaveBeenCalledWith(mockStrapi, 'missing_token');
    expect(sendDidUseMcpServer).not.toHaveBeenCalled();
    expect(sendDidNotHandleMcpRequest).not.toHaveBeenCalled();
  });

  test('should not send handle failure telemetry when authentication throws', async () => {
    mockAuthenticationStrategy.authenticate = vi
      .fn()
      .mockRejectedValue(new Error('Auth service unavailable'));

    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      config: mockConfig,
      createServerWithRegistries: vi.fn(),
      capabilityDefinitions: {} as any,
    };

    const handler = createPostHandler(deps);
    const { res, writeHeadSpy } = makeRes();
    const ctx = makeCtx(makeReq(), res);

    await handler(ctx, () => Promise.resolve());

    expect(writeHeadSpy).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(sendDidUseMcpServer).not.toHaveBeenCalled();
    expect(sendDidNotAuthenticateMcpRequest).not.toHaveBeenCalled();
    expect(sendDidNotHandleMcpRequest).not.toHaveBeenCalled();
  });

  test('should create ephemeral server + stateless transport, connect and handle request', async () => {
    const mockMcpServer = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockTransport = { handleRequest: vi.fn().mockResolvedValue(undefined) };

    const createServerWithRegistries = vi.fn().mockReturnValue({
      mcpServer: mockMcpServer,
      registries: { tools: {}, prompts: {}, resources: {} },
    });

    const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
    NodeStreamableHTTPServerTransport.mockImplementation(function MockTransport() {
      return mockTransport;
    });

    const capabilityDefinitions = {
      tools: {} as any,
      prompts: {} as any,
      resources: {} as any,
    };

    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      config: mockConfig,
      createServerWithRegistries,
      capabilityDefinitions,
    };

    const handler = createPostHandler(deps);

    const requestBody = { method: 'initialize' };
    const req = makeReq();
    const res = { headersSent: false } as unknown as ServerResponse;
    const ctx = makeCtx(req, res, requestBody);

    await handler(ctx, () => Promise.resolve());

    expect(createServerWithRegistries).toHaveBeenCalledWith({
      strapi: mockStrapi,
      definitions: capabilityDefinitions,
      isDevMode: mockConfig.isDevMode(),
      ability: expect.objectContaining({ can: expect.any(Function) }),
      user: { id: 42 },
      // `initialize` lists and calls no tool, so no tool schema is needed.
      toolSchemaScope: new Set(),
    });
    expect(NodeStreamableHTTPServerTransport).toHaveBeenCalledWith({
      sessionIdGenerator: undefined,
    });
    expect(mockMcpServer.connect).toHaveBeenCalledWith(mockTransport);
    expect(mockTransport.handleRequest).toHaveBeenCalledWith(req, res, requestBody);
    expect(sendDidUseMcpServer).toHaveBeenCalledWith(mockStrapi);
    expect(mockMcpServer.close).toHaveBeenCalledTimes(1);
  });

  test('should scope tool schemas to the tool a tools/call request invokes', async () => {
    const mockMcpServer = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const createServerWithRegistries = vi.fn().mockReturnValue({
      mcpServer: mockMcpServer,
      registries: { tools: {}, prompts: {}, resources: {} },
    });

    const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
    NodeStreamableHTTPServerTransport.mockImplementation(() => ({
      handleRequest: vi.fn().mockResolvedValue(undefined),
    }));

    const handler = createPostHandler({
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      config: mockConfig,
      createServerWithRegistries,
      capabilityDefinitions: { tools: {} as any, prompts: {} as any, resources: {} as any },
    });

    const requestBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'get_page', arguments: {} },
    };
    const res = { headersSent: false } as unknown as ServerResponse;
    await handler(makeCtx(makeReq(), res, requestBody), () => Promise.resolve());

    expect(createServerWithRegistries).toHaveBeenCalledWith(
      expect.objectContaining({ toolSchemaScope: new Set(['get_page']) })
    );
  });

  test('should expose the authenticated user and mcp audit source on ctx.state', async () => {
    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      config: mockConfig,
      createServerWithRegistries: vi.fn().mockReturnValue({
        mcpServer: {
          connect: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        },
        registries: {},
      }),
      capabilityDefinitions: {} as any,
    };

    const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
    NodeStreamableHTTPServerTransport.mockImplementation(function MockTransport() {
      return {
        handleRequest: vi.fn().mockResolvedValue(undefined),
      };
    });

    const handler = createPostHandler(deps);
    const ctx = makeCtx(makeReq(), { headersSent: false } as unknown as ServerResponse);

    await handler(ctx, () => Promise.resolve());

    // user (id 42), not credentials (id 7) — the actor is the token owner.
    expect(ctx.state.user).toEqual({ id: 42 });
    expect(ctx.state.auditSource).toBe('mcp');
  });

  test('should call withTimeout with connectTimeoutMs for connect and requestTimeoutMs for handleRequest', async () => {
    const mockMcpServer = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockTransport = { handleRequest: vi.fn().mockResolvedValue(undefined) };

    const createServerWithRegistries = vi.fn().mockReturnValue({
      mcpServer: mockMcpServer,
      registries: {},
    });

    const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
    NodeStreamableHTTPServerTransport.mockImplementation(function MockTransport() {
      return mockTransport;
    });

    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      config: mockConfig,
      createServerWithRegistries,
      capabilityDefinitions: {} as any,
    };

    const handler = createPostHandler(deps);
    const ctx = makeCtx(makeReq(), { headersSent: false } as unknown as ServerResponse);

    await handler(ctx, () => Promise.resolve());

    const withTimeoutMock = withTimeout as Mock;
    const calls = withTimeoutMock.mock.calls;

    const connectCall = calls.find((c) => c[2] === 'mcpServer.connect');
    const handleRequestCall = calls.find((c) => c[2] === 'transport.handleRequest');

    expect(connectCall).toBeDefined();
    expect(connectCall![1]).toBe(mockConfig.connectTimeoutMs);

    expect(handleRequestCall).toBeDefined();
    expect(handleRequestCall![1]).toBe(mockConfig.requestTimeoutMs);

    expect(mockConfig.connectTimeoutMs).not.toBe(mockConfig.requestTimeoutMs);
  });

  test('should use null as request body when ctx.request.body is undefined', async () => {
    const mockMcpServer = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockTransport = { handleRequest: vi.fn().mockResolvedValue(undefined) };

    const createServerWithRegistries = vi.fn().mockReturnValue({
      mcpServer: mockMcpServer,
      registries: {},
    });

    const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
    NodeStreamableHTTPServerTransport.mockImplementation(function MockTransport() {
      return mockTransport;
    });

    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      config: mockConfig,
      createServerWithRegistries,
      capabilityDefinitions: {} as any,
    };

    const handler = createPostHandler(deps);
    const req = makeReq();
    const res = { headersSent: false } as unknown as ServerResponse;
    const ctx = makeCtx(req, res, undefined);

    await handler(ctx, () => Promise.resolve());

    expect(mockTransport.handleRequest).toHaveBeenCalledWith(req, res, null);
  });

  describe('error handling', () => {
    test('should return INTERNAL_ERROR when handleRequest throws', async () => {
      const mockMcpServer = {
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockTransport = {
        handleRequest: vi.fn().mockRejectedValue(new Error('Request failed')),
      };

      const createServerWithRegistries = vi.fn().mockReturnValue({
        mcpServer: mockMcpServer,
        registries: {},
      });

      const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
      NodeStreamableHTTPServerTransport.mockImplementation(function MockTransport() {
        return mockTransport;
      });

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        config: mockConfig,
        createServerWithRegistries,
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);
      const { res, writeHeadSpy } = makeRes();
      const ctx = makeCtx(makeReq(), res);

      await handler(ctx, () => Promise.resolve());

      expect(logErrorSpy).toHaveBeenCalledWith(
        '[MCP] Error handling POST request',
        expect.objectContaining({ error: 'Request failed' })
      );
      expect(writeHeadSpy).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
      expect(mockMcpServer.close).toHaveBeenCalledTimes(1);
      expect(sendDidNotHandleMcpRequest).toHaveBeenCalledWith(mockStrapi, 'error');
    });

    test('should return INTERNAL_ERROR when mcpServer.connect throws', async () => {
      const mockMcpServer = {
        connect: vi.fn().mockRejectedValue(new Error('Connect failed')),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const createServerWithRegistries = vi.fn().mockReturnValue({
        mcpServer: mockMcpServer,
        registries: {},
      });

      const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
      NodeStreamableHTTPServerTransport.mockImplementation(function MockTransport() {
        return { handleRequest: vi.fn() };
      });

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        config: mockConfig,
        createServerWithRegistries,
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);
      const { res, writeHeadSpy } = makeRes();
      const ctx = makeCtx(makeReq(), res);

      await handler(ctx, () => Promise.resolve());

      expect(logErrorSpy).toHaveBeenCalledWith(
        '[MCP] Error handling POST request',
        expect.objectContaining({ error: 'Connect failed' })
      );
      expect(writeHeadSpy).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
      expect(mockMcpServer.close).toHaveBeenCalledTimes(1);
      expect(sendDidNotHandleMcpRequest).toHaveBeenCalledWith(mockStrapi, 'error');
    });

    test('should handle non-Error exceptions', async () => {
      const mockMcpServer = {
        connect: vi.fn().mockRejectedValue('String error'),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const createServerWithRegistries = vi.fn().mockReturnValue({
        mcpServer: mockMcpServer,
        registries: {},
      });

      const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
      NodeStreamableHTTPServerTransport.mockImplementation(function MockTransport() {
        return { handleRequest: vi.fn() };
      });

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        config: mockConfig,
        createServerWithRegistries,
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);
      const { res, writeHeadSpy } = makeRes();
      const ctx = makeCtx(makeReq(), res);

      await handler(ctx, () => Promise.resolve());

      expect(logErrorSpy).toHaveBeenCalledWith(
        '[MCP] Error handling POST request',
        expect.objectContaining({ error: 'Unknown error' })
      );
      expect(writeHeadSpy).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
      expect(sendDidNotHandleMcpRequest).toHaveBeenCalledWith(mockStrapi, 'error');
    });

    test('should record usage and handle failure telemetry when an authenticated request fails', async () => {
      const mockMcpServer = {
        connect: vi.fn().mockRejectedValue(new Error('Connect failed')),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const createServerWithRegistries = vi.fn().mockReturnValue({
        mcpServer: mockMcpServer,
        registries: {},
      });

      const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
      NodeStreamableHTTPServerTransport.mockImplementation(function MockTransport() {
        return { handleRequest: vi.fn() };
      });

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        config: mockConfig,
        createServerWithRegistries,
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);
      const { res } = makeRes();
      const ctx = makeCtx(makeReq(), res);

      await handler(ctx, () => Promise.resolve());

      expect(sendDidUseMcpServer).toHaveBeenCalledWith(mockStrapi);
      expect(sendDidNotHandleMcpRequest).toHaveBeenCalledWith(mockStrapi, 'error');
      expect(sendDidNotAuthenticateMcpRequest).not.toHaveBeenCalled();
    });

    test('should classify timeout failures', async () => {
      const mockMcpServer = {
        connect: vi
          .fn()
          .mockRejectedValue(new Error("Operation 'mcpServer.connect' timed out after 30000ms")),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const createServerWithRegistries = vi.fn().mockReturnValue({
        mcpServer: mockMcpServer,
        registries: {},
      });

      const { NodeStreamableHTTPServerTransport } = vi.mocked(mcpNodeSdk) as any;
      NodeStreamableHTTPServerTransport.mockImplementation(function MockTransport() {
        return { handleRequest: vi.fn() };
      });

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        config: mockConfig,
        createServerWithRegistries,
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);
      const { res, writeHeadSpy } = makeRes();
      const ctx = makeCtx(makeReq(), res);

      await handler(ctx, () => Promise.resolve());

      expect(writeHeadSpy).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
      expect(sendDidNotHandleMcpRequest).toHaveBeenCalledWith(mockStrapi, 'timeout');
    });
  });
});
