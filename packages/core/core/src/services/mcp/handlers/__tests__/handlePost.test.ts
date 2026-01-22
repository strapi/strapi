import type { Core } from '@strapi/types';
import { IncomingMessage, ServerResponse } from 'node:http';
import { McpConfiguration } from '../../internal/McpConfiguration';
import { McpSessionManager } from '../../internal/McpSessionManager';
import { McpSession } from '../../session';
import { createPostHandler } from '../handlePost';
import type { McpHandlerDependencies } from '../types';

jest.mock('../../utils/withTimeout', () => ({
  withTimeout: jest.fn((promise) => promise),
}));

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: jest.fn(),
}));

describe('handlePost', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let mockConfig: McpConfiguration;
  let mockSessionManager: McpSessionManager;
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
  });

  describe('existing session', () => {
    test('should handle request with existing session', async () => {
      const sessionId = '12345678-1234-1234-1234-123456789abc';
      const updateActivitySpy = jest.fn();
      const handleRequestSpy = jest.fn().mockResolvedValue(undefined);

      const mockSession = {
        lastActivity: Date.now(),
        updateActivity: updateActivitySpy,
        transport: {
          handleRequest: handleRequestSpy,
        },
      } as unknown as McpSession;

      mockSessionManager.set(sessionId, mockSession);

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
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
      expect(handleRequestSpy).toHaveBeenCalledWith(req, res, requestBody);
    });

    test('should return error when session is invalid', async () => {
      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
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

      expect(writeHeadSpy).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
      expect(endSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid session'));
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
        expect.stringContaining('Maximum number of sessions reached')
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
        transport: {
          handleRequest: handleRequestSpy,
        },
      } as unknown as McpSession;

      mockSessionManager.set(sessionId, mockSession);

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
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
        transport: {
          handleRequest: handleRequestSpy,
        },
      } as unknown as McpSession;

      mockSessionManager.set(sessionId, mockSession);

      const deps: McpHandlerDependencies = {
        strapi: mockStrapi as Core.Strapi,
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
