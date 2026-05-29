import type { Core } from '@strapi/types';
import { IncomingMessage, ServerResponse } from 'node:http';
import { McpConfiguration } from '../../internal/McpConfiguration';
import { JSON_RPC_ERRORS } from '../../utils/jsonRpcErrors';
import { createPostHandler } from '../handlePost';
import type { McpHandlerDependencies } from '../types';

import { withTimeout } from '../../utils/withTimeout';

jest.mock('../../utils/withTimeout', () => ({
  withTimeout: jest.fn((promise) => promise),
}));

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: jest.fn(),
}));

describe('handlePost', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let mockConfig: McpConfiguration;
  let mockAuthenticationStrategy: McpHandlerDependencies['authenticationStrategy'];
  let logErrorSpy: jest.Mock;
  let logInfoSpy: jest.Mock;

  beforeEach(() => {
    logErrorSpy = jest.fn();
    logInfoSpy = jest.fn();
    mockStrapi = {
      log: {
        error: logErrorSpy,
        info: logInfoSpy,
      } as any,
      config: {
        get: jest.fn((key, defaultValue) => defaultValue),
      } as any,
    };
    mockConfig = new McpConfiguration(mockStrapi as Core.Strapi);
    mockAuthenticationStrategy = {
      authenticate: jest.fn().mockResolvedValue({
        authenticated: true,
        credentials: { id: 1 },
        user: { id: 1 },
        ability: { can: jest.fn(() => true) },
      }),
    };
  });

  const makeCtx = (req: IncomingMessage, res: ServerResponse, body?: unknown) =>
    ({ req, res, request: { body }, respond: true }) as any;

  const makeRes = () => {
    const writeHeadSpy = jest.fn();
    const endSpy = jest.fn();
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
      createServerWithRegistries: jest.fn().mockReturnValue({
        mcpServer: {
          connect: jest.fn().mockResolvedValue(undefined),
          close: jest.fn().mockResolvedValue(undefined),
        },
        registries: {},
      }),
      capabilityDefinitions: {} as any,
    };

    const { StreamableHTTPServerTransport } = jest.requireMock(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );
    StreamableHTTPServerTransport.mockImplementation(() => ({
      handleRequest: jest.fn().mockResolvedValue(undefined),
    }));

    const handler = createPostHandler(deps);
    const ctx = makeCtx(makeReq(), { headersSent: false } as unknown as ServerResponse);

    await handler(ctx, () => Promise.resolve());

    expect(ctx.respond).toBe(false);
  });

  test('should return AUTHENTICATION_REQUIRED when authentication fails', async () => {
    mockAuthenticationStrategy.authenticate = jest.fn().mockResolvedValue({
      authenticated: false,
      credentials: null,
      ability: null,
      error: null,
    });

    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      config: mockConfig,
      createServerWithRegistries: jest.fn(),
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
  });

  test('should create ephemeral server + stateless transport, connect and handle request', async () => {
    const mockMcpServer = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const mockTransport = { handleRequest: jest.fn().mockResolvedValue(undefined) };

    const createServerWithRegistries = jest.fn().mockReturnValue({
      mcpServer: mockMcpServer,
      registries: { tools: {}, prompts: {}, resources: {} },
    });

    const { StreamableHTTPServerTransport } = jest.requireMock(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );
    StreamableHTTPServerTransport.mockImplementation(() => mockTransport);

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
      user: { id: 1 },
    });
    expect(StreamableHTTPServerTransport).toHaveBeenCalledWith({ sessionIdGenerator: undefined });
    expect(mockMcpServer.connect).toHaveBeenCalledWith(mockTransport);
    expect(mockTransport.handleRequest).toHaveBeenCalledWith(req, res, requestBody);
    expect(mockMcpServer.close).toHaveBeenCalledTimes(1);
  });

  test('should call withTimeout with connectTimeoutMs for connect and requestTimeoutMs for handleRequest', async () => {
    const mockMcpServer = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const mockTransport = { handleRequest: jest.fn().mockResolvedValue(undefined) };

    const createServerWithRegistries = jest.fn().mockReturnValue({
      mcpServer: mockMcpServer,
      registries: {},
    });

    const { StreamableHTTPServerTransport } = jest.requireMock(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );
    StreamableHTTPServerTransport.mockImplementation(() => mockTransport);

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

    const withTimeoutMock = withTimeout as jest.Mock;
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
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const mockTransport = { handleRequest: jest.fn().mockResolvedValue(undefined) };

    const createServerWithRegistries = jest.fn().mockReturnValue({
      mcpServer: mockMcpServer,
      registries: {},
    });

    const { StreamableHTTPServerTransport } = jest.requireMock(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );
    StreamableHTTPServerTransport.mockImplementation(() => mockTransport);

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
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      };
      const mockTransport = {
        handleRequest: jest.fn().mockRejectedValue(new Error('Request failed')),
      };

      const createServerWithRegistries = jest.fn().mockReturnValue({
        mcpServer: mockMcpServer,
        registries: {},
      });

      const { StreamableHTTPServerTransport } = jest.requireMock(
        '@modelcontextprotocol/sdk/server/streamableHttp.js'
      );
      StreamableHTTPServerTransport.mockImplementation(() => mockTransport);

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
    });

    test('should return INTERNAL_ERROR when mcpServer.connect throws', async () => {
      const mockMcpServer = {
        connect: jest.fn().mockRejectedValue(new Error('Connect failed')),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const createServerWithRegistries = jest.fn().mockReturnValue({
        mcpServer: mockMcpServer,
        registries: {},
      });

      const { StreamableHTTPServerTransport } = jest.requireMock(
        '@modelcontextprotocol/sdk/server/streamableHttp.js'
      );
      StreamableHTTPServerTransport.mockImplementation(() => ({ handleRequest: jest.fn() }));

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
    });

    test('should handle non-Error exceptions', async () => {
      const mockMcpServer = {
        connect: jest.fn().mockRejectedValue('String error'),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const createServerWithRegistries = jest.fn().mockReturnValue({
        mcpServer: mockMcpServer,
        registries: {},
      });

      const { StreamableHTTPServerTransport } = jest.requireMock(
        '@modelcontextprotocol/sdk/server/streamableHttp.js'
      );
      StreamableHTTPServerTransport.mockImplementation(() => ({ handleRequest: jest.fn() }));

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
    });
  });
});
