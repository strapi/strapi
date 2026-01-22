import type { Core } from '@strapi/types';
import { IncomingMessage, ServerResponse } from 'node:http';
import { McpConfiguration } from '../../internal/McpConfiguration';
import { McpSessionManager } from '../../internal/McpSessionManager';
import { McpSession } from '../../session';
import { createGetHandler } from '../handleGet';
import type { McpHandlerDependencies } from '../types';

jest.mock('../../utils/withTimeout', () => ({
  withTimeout: jest.fn((promise) => promise),
}));

describe('handleGet', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let mockConfig: McpConfiguration;
  let mockSessionManager: McpSessionManager;
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
  });

  test('should return error when session ID is missing', async () => {
    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
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

    expect(writeHeadSpy).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(expect.stringContaining('Session ID required'));
  });

  test('should return error when session is invalid', async () => {
    const deps: McpHandlerDependencies = {
      strapi: mockStrapi as Core.Strapi,
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

    expect(writeHeadSpy).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid session'));
  });

  test('should handle request when session is valid', async () => {
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
    expect(handleRequestSpy).toHaveBeenCalledWith(req, res, null);
  });

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
    expect(writeHeadSpy).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
  });
});
