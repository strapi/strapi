import type { Core } from '@strapi/types';
import { IncomingMessage, ServerResponse } from 'node:http';
import { McpConfiguration } from '../../internal/McpConfiguration';
import { McpSessionManager } from '../../internal/McpSessionManager';
import { McpSession } from '../../internal/McpSession';
import { JSON_RPC_ERRORS } from '../../utils/jsonRpcErrors';
import { syncMcpSessionCapabilities } from '../../internal/syncMcpSessionCapabilities';
import { createDeleteHandler } from '../handleDelete';
import type { McpHandlerDependencies } from '../types';

jest.mock('../../utils/withTimeout', () => ({
  withTimeout: jest.fn((promise) => promise),
}));

jest.mock('../../internal/syncMcpSessionCapabilities', () => ({
  syncMcpSessionCapabilities: jest.fn(),
}));

describe('handleDelete', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let mockConfig: McpConfiguration;
  let mockSessionManager: McpSessionManager;
  let mockAuthenticationStrategy: McpHandlerDependencies['authenticationStrategy'];
  let logErrorSpy: jest.Mock;

  beforeEach(() => {
    logErrorSpy = jest.fn();
    mockStrapi = {
      log: {
        error: logErrorSpy,
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

  test('should return error when session ID is missing', async () => {
    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      sessionManager: mockSessionManager,
      config: mockConfig,
      createServerWithRegistries: jest.fn(),
      capabilityDefinitions: {} as any,
    };

    const handler = createDeleteHandler(deps);

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

    const handler = createDeleteHandler(deps);

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

  test('should return error when session is invalid', async () => {
    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
      authenticationStrategy: mockAuthenticationStrategy,
      sessionManager: mockSessionManager,
      config: mockConfig,
      createServerWithRegistries: jest.fn(),
      capabilityDefinitions: {} as any,
    };

    const handler = createDeleteHandler(deps);

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

    const handler = createDeleteHandler(deps);

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

  test('should handle delete request when session is valid', async () => {
    const sessionId = '12345678-1234-1234-1234-123456789abc';
    const handleRequestSpy = jest.fn().mockResolvedValue(undefined);

    const mockSession = {
      lastActivity: Date.now(),
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

    const handler = createDeleteHandler(deps);

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
    } as any;

    await handler(ctx, () => Promise.resolve());

    expect(syncMcpSessionCapabilities).toHaveBeenCalledWith({
      session: mockSession,
      definitions: deps.capabilityDefinitions,
      ability: expect.objectContaining({ can: expect.any(Function) }),
      isDevMode: mockConfig.isDevMode(),
    });
    expect(jest.mocked(syncMcpSessionCapabilities).mock.invocationCallOrder[0]).toBeLessThan(
      handleRequestSpy.mock.invocationCallOrder[0]
    );
    expect(handleRequestSpy).toHaveBeenCalledWith(req, res, null);
  });

  test('should handle errors during delete request', async () => {
    const sessionId = '12345678-1234-1234-1234-123456789abc';
    const error = new Error('Delete failed');
    const handleRequestSpy = jest.fn().mockRejectedValue(error);

    const mockSession = {
      lastActivity: Date.now(),
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

    const handler = createDeleteHandler(deps);

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
    } as any;

    await handler(ctx, () => Promise.resolve());

    expect(logErrorSpy).toHaveBeenCalledWith(
      '[MCP] Error handling DELETE request',
      expect.objectContaining({
        error: 'Delete failed',
      })
    );
    expect(writeHeadSpy).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
  });
});
