import type { Core } from '@strapi/types';
import { IncomingMessage, ServerResponse } from 'node:http';
import { McpConfiguration } from '../../internal/McpConfiguration';
import { McpSessionManager } from '../../internal/McpSessionManager';
import { McpSession } from '../../internal/McpSession';
import { JSON_RPC_ERRORS } from '../../utils/jsonRpcErrors';
import { syncMcpSessionCapabilities } from '../../internal/syncMcpSessionCapabilities';
import { createPostHandler } from '../handlePost';
import type { McpHandlerDependencies } from '../types';

jest.mock('../../utils/withTimeout', () => ({
  withTimeout: jest.fn((promise) => promise),
}));

jest.mock('../../internal/syncMcpSessionCapabilities', () => ({
  syncMcpSessionCapabilities: jest.fn(),
}));

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: jest.fn(),
}));

describe('handlePost', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let mockConfig: McpConfiguration;
  let mockSessionManager: McpSessionManager;
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
    mockSessionManager = new McpSessionManager(mockConfig, mockStrapi as Core.Strapi);
    mockAuthenticationStrategy = {
      authenticate: jest.fn().mockResolvedValue({
        authenticated: true,
        credentials: { id: 1 },
        ability: { can: jest.fn(() => true) },
      }),
    };
    jest.mocked(syncMcpSessionCapabilities).mockClear();
  });

  test('should return error when authentication fails', async () => {
    mockAuthenticationStrategy.authenticate = jest.fn().mockResolvedValue({
      authenticated: false,
      credentials: null,
      ability: null,
      error: null,
    });

    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      sessionManager: mockSessionManager,
      config: mockConfig,
      createServerWithRegistries: jest.fn(),
      capabilityDefinitions: {} as any,
    };

    const handler = createPostHandler(deps);

    const req = {
      headers: {},
    } as unknown as IncomingMessage;

    const writeHeadSpy = jest.fn();
    const endSpy = jest.fn();
    const res = {
      headersSent: false,
      writeHead: writeHeadSpy,
      end: endSpy,
    } as unknown as ServerResponse;

    const ctx = {
      req,
      res,
      request: {},
    } as any;

    await handler(ctx, () => Promise.resolve());

    expect(writeHeadSpy).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.SESSION_REQUIRED.code,
          message: JSON_RPC_ERRORS.SESSION_REQUIRED.message,
        },
        id: null,
      })
    );
  });

  describe('existing session', () => {
    test('should handle request with existing session', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789abc';
      const updateActivitySpy = jest.fn();
      const handleRequestSpy = jest.fn().mockResolvedValue(undefined);

      const mockSession = {
        lastActivity: Date.now(),
        updateActivity: updateActivitySpy,
        adminTokenId: 1,
        transport: {
          handleRequest: handleRequestSpy,
        },
      } as unknown as McpSession;

      mockSessionManager.set(sessionId, mockSession);

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        sessionManager: mockSessionManager,
        config: mockConfig,
        createServerWithRegistries: jest.fn(),
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);

      const requestBody = { method: 'test' };
      const req = {
        headers: {
          'mcp-session-id': sessionId,
        },
      } as unknown as IncomingMessage;

      const res = {
        headersSent: false,
      } as unknown as ServerResponse;

      const ctx = {
        req,
        res,
        request: {
          body: requestBody,
        },
      } as any;

      await handler(ctx, () => Promise.resolve());

      expect(updateActivitySpy).toHaveBeenCalled();
      expect(syncMcpSessionCapabilities).toHaveBeenCalledWith({
        session: mockSession,
        definitions: deps.capabilityDefinitions,
        ability: expect.objectContaining({ can: expect.any(Function) }),
        isDevMode: mockConfig.isDevMode(),
      });
      expect(jest.mocked(syncMcpSessionCapabilities).mock.invocationCallOrder[0]).toBeLessThan(
        handleRequestSpy.mock.invocationCallOrder[0]
      );
      expect(handleRequestSpy).toHaveBeenCalledWith(req, res, requestBody);
    });

    test('should return error when session is invalid', async () => {
      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        sessionManager: mockSessionManager,
        config: mockConfig,
        createServerWithRegistries: jest.fn(),
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);

      const req = {
        headers: {
          'mcp-session-id': '12345678-1234-1234-1234-123456789abc',
        },
      } as unknown as IncomingMessage;

      const writeHeadSpy = jest.fn();
      const endSpy = jest.fn();
      const res = {
        headersSent: false,
        writeHead: writeHeadSpy,
        end: endSpy,
      } as unknown as ServerResponse;

      const ctx = {
        req,
        res,
        request: {},
      } as any;

      await handler(ctx, () => Promise.resolve());

      expect(writeHeadSpy).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
      expect(endSpy).toHaveBeenCalledWith(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: JSON_RPC_ERRORS.INVALID_SESSION.code,
            message: JSON_RPC_ERRORS.INVALID_SESSION.message,
          },
          id: null,
        })
      );
    });

    test('should return error when session admin token does not match credentials', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789abc';
      const mockSession = {
        lastActivity: Date.now(),
        updateActivity: jest.fn(),
        adminTokenId: 999,
        transport: {
          handleRequest: jest.fn(),
        },
      } as unknown as McpSession;

      mockSessionManager.set(sessionId, mockSession);

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        sessionManager: mockSessionManager,
        config: mockConfig,
        createServerWithRegistries: jest.fn(),
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);

      const req = {
        headers: {
          'mcp-session-id': sessionId,
        },
      } as unknown as IncomingMessage;

      const writeHeadSpy = jest.fn();
      const endSpy = jest.fn();
      const res = {
        headersSent: false,
        writeHead: writeHeadSpy,
        end: endSpy,
      } as unknown as ServerResponse;

      const ctx = {
        req,
        res,
        request: {},
      } as any;

      await handler(ctx, () => Promise.resolve());

      expect(writeHeadSpy).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
      expect(endSpy).toHaveBeenCalledWith(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: JSON_RPC_ERRORS.INVALID_SESSION.code,
            message: JSON_RPC_ERRORS.INVALID_SESSION.message,
          },
          id: null,
        })
      );
    });
  });

  describe('new session', () => {
    test('should create new session when no session ID provided', async () => {
      const mockMcpServer = {
        connect: jest.fn().mockResolvedValue(undefined),
      };

      const mockTransport = {
        handleRequest: jest.fn().mockResolvedValue(undefined),
      };

      const mockRegistries = {
        toolRegistry: {},
        promptRegistry: {},
        resourceRegistry: {},
      };

      const createServerWithRegistries = jest.fn().mockReturnValue({
        mcpServer: mockMcpServer,
        registries: mockRegistries,
      });

      // Mock the StreamableHTTPServerTransport constructor
      const { StreamableHTTPServerTransport } = jest.requireMock(
        '@modelcontextprotocol/sdk/server/streamableHttp.js'
      );
      StreamableHTTPServerTransport.mockImplementation((options: any) => {
        // Immediately initialize session for testing
        setTimeout(() => {
          if (options.onsessioninitialized) {
            options.onsessioninitialized('new-session-id');
          }
        }, 0);
        return mockTransport;
      });

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        sessionManager: mockSessionManager,
        config: mockConfig,
        createServerWithRegistries,
        capabilityDefinitions: {
          tools: {} as any,
          prompts: {} as any,
          resources: {} as any,
        },
      };

      const handler = createPostHandler(deps);

      const requestBody = { method: 'initialize' };
      const req = {
        headers: {},
      } as unknown as IncomingMessage;

      const res = {
        headersSent: false,
      } as unknown as ServerResponse;

      const ctx = {
        req,
        res,
        request: {
          body: requestBody,
        },
      } as any;

      await handler(ctx, () => Promise.resolve());

      expect(createServerWithRegistries).toHaveBeenCalledWith({
        strapi: mockStrapi,
        definitions: deps.capabilityDefinitions,
        isDevMode: mockConfig.isDevMode(),
        ability: expect.objectContaining({ can: expect.any(Function) }),
      });
      expect(mockMcpServer.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockTransport.handleRequest).toHaveBeenCalledWith(req, res, requestBody);
    });

    test('should return error when max sessions reached', async () => {
      // Fill up session manager to max
      const maxSessions = mockConfig.maxSessions;
      for (let i = 0; i < maxSessions; i += 1) {
        mockSessionManager.set(`session-${i}`, {
          lastActivity: Date.now(),
        } as any as McpSession);
      }

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        sessionManager: mockSessionManager,
        config: mockConfig,
        createServerWithRegistries: jest.fn(),
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);

      const req = {
        headers: {},
      } as unknown as IncomingMessage;

      const writeHeadSpy = jest.fn();
      const endSpy = jest.fn();
      const res = {
        headersSent: false,
        writeHead: writeHeadSpy,
        end: endSpy,
      } as unknown as ServerResponse;

      const ctx = {
        req,
        res,
        request: {},
      } as any;

      await handler(ctx, () => Promise.resolve());

      expect(writeHeadSpy).toHaveBeenCalledWith(503, { 'Content-Type': 'application/json' });
      expect(endSpy).toHaveBeenCalledWith(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: JSON_RPC_ERRORS.MAX_SESSIONS_REACHED.code,
            message: JSON_RPC_ERRORS.MAX_SESSIONS_REACHED.message,
          },
          id: null,
        })
      );
    });
  });

  describe('error handling', () => {
    test('should handle errors during request processing', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789abc';
      const error = new Error('Request failed');
      const handleRequestSpy = jest.fn().mockRejectedValue(error);

      const mockSession = {
        lastActivity: Date.now(),
        updateActivity: jest.fn(),
        adminTokenId: 1,
        transport: {
          handleRequest: handleRequestSpy,
        },
      } as unknown as McpSession;

      mockSessionManager.set(sessionId, mockSession);

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        sessionManager: mockSessionManager,
        config: mockConfig,
        createServerWithRegistries: jest.fn(),
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);

      const req = {
        headers: {
          'mcp-session-id': sessionId,
        },
      } as unknown as IncomingMessage;

      const writeHeadSpy = jest.fn();
      const endSpy = jest.fn();
      const res = {
        headersSent: false,
        writeHead: writeHeadSpy,
        end: endSpy,
      } as unknown as ServerResponse;

      const ctx = {
        req,
        res,
        request: {},
      } as any;

      await handler(ctx, () => Promise.resolve());

      expect(logErrorSpy).toHaveBeenCalledWith(
        '[MCP] Error handling POST request',
        expect.objectContaining({
          error: 'Request failed',
        })
      );
      expect(writeHeadSpy).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    });

    test('should handle non-Error exceptions', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789abc';
      const handleRequestSpy = jest.fn().mockRejectedValue('String error');

      const mockSession = {
        lastActivity: Date.now(),
        updateActivity: jest.fn(),
        adminTokenId: 1,
        transport: {
          handleRequest: handleRequestSpy,
        },
      } as unknown as McpSession;

      mockSessionManager.set(sessionId, mockSession);

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
        authenticationStrategy: mockAuthenticationStrategy,
        sessionManager: mockSessionManager,
        config: mockConfig,
        createServerWithRegistries: jest.fn(),
        capabilityDefinitions: {} as any,
      };

      const handler = createPostHandler(deps);

      const req = {
        headers: {
          'mcp-session-id': sessionId,
        },
      } as unknown as IncomingMessage;

      const writeHeadSpy = jest.fn();
      const endSpy = jest.fn();
      const res = {
        headersSent: false,
        writeHead: writeHeadSpy,
        end: endSpy,
      } as unknown as ServerResponse;

      const ctx = {
        req,
        res,
        request: {},
      } as any;

      await handler(ctx, () => Promise.resolve());

      expect(logErrorSpy).toHaveBeenCalledWith(
        '[MCP] Error handling POST request',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
      expect(writeHeadSpy).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    });
  });
});
