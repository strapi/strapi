import type { Core } from '@strapi/types';
import { IncomingMessage, ServerResponse } from 'node:http';
import { McpConfiguration } from '../../internal/McpConfiguration';
import { McpSessionManager } from '../../internal/McpSessionManager';
import { McpSession } from '../../internal/McpSession';
import { JSON_RPC_ERRORS } from '../../utils/jsonRpcErrors';
import { syncMcpSessionCapabilities } from '../../internal/syncMcpSessionCapabilities';
import { createGetHandler } from '../handleGet';
import type { McpHandlerDependencies } from '../types';

jest.mock('../../internal/syncMcpSessionCapabilities', () => ({
  syncMcpSessionCapabilities: jest.fn(),
}));

describe('handleGet', () => {
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

    const handler = createGetHandler(deps);

    const req = {
      headers: {},
    } as IncomingMessage;

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

    expect(writeHeadSpy).toHaveBeenCalledWith(JSON_RPC_ERRORS.SESSION_REQUIRED.httpStatus, {
      'Content-Type': 'application/json',
    });
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

    const handler = createGetHandler(deps);

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

    expect(writeHeadSpy).toHaveBeenCalledWith(JSON_RPC_ERRORS.SESSION_REQUIRED.httpStatus, {
      'Content-Type': 'application/json',
    });
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

    const handler = createGetHandler(deps);

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

    expect(writeHeadSpy).toHaveBeenCalledWith(JSON_RPC_ERRORS.INVALID_SESSION.httpStatus, {
      'Content-Type': 'application/json',
    });
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

    const handler = createGetHandler(deps);

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

    expect(writeHeadSpy).toHaveBeenCalledWith(JSON_RPC_ERRORS.INVALID_SESSION.httpStatus, {
      'Content-Type': 'application/json',
    });
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

  test('should handle request when session is valid', async () => {
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

    const handler = createGetHandler(deps);

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
    expect(handleRequestSpy).toHaveBeenCalledWith(req, res, null);
  });

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

    const handler = createGetHandler(deps);

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
      '[MCP] Error handling GET request',
      expect.objectContaining({
        error: 'Request failed',
      })
    );
    expect(writeHeadSpy).toHaveBeenCalledWith(JSON_RPC_ERRORS.INTERNAL_ERROR.httpStatus, {
      'Content-Type': 'application/json',
    });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.INTERNAL_ERROR.code,
          message: JSON_RPC_ERRORS.INTERNAL_ERROR.message,
        },
        id: null,
      })
    );
  });
});
