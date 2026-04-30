import type { Core } from '@strapi/types';
import { McpSession } from '../../session';
import { McpConfiguration } from '../McpConfiguration';
import { McpSessionManager } from '../McpSessionManager';

describe('McpSessionManager', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let mockConfig: McpConfiguration;
  let sessionManager: McpSessionManager;
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
        get: jest.fn((_, defaultValue) => defaultValue),
      } as any,
    };
    mockConfig = new McpConfiguration(mockStrapi as Core.Strapi);
    sessionManager = new McpSessionManager(mockConfig, mockStrapi as Core.Strapi);
  });

  describe('get and set', () => {
    test('should store and retrieve sessions', () => {
      const mockSession = {
        lastActivity: Date.now(),
        server: { close: jest.fn() },
      } as any as McpSession;

      sessionManager.set('session-1', mockSession);

      expect(sessionManager.get('session-1')).toBe(mockSession);
    });

    test('should return undefined for non-existent session', () => {
      expect(sessionManager.get('non-existent')).toBeUndefined();
    });
  });

  describe('delete', () => {
    test('should delete session and close server', async () => {
      const closeSpy = jest.fn().mockResolvedValue(undefined);
      const mockSession = {
        lastActivity: Date.now(),
        server: { close: closeSpy },
      } as any as McpSession;

      sessionManager.set('session-1', mockSession);

      await sessionManager.delete('session-1');

      expect(closeSpy).toHaveBeenCalled();
      expect(sessionManager.get('session-1')).toBeUndefined();
    });

    test('should handle errors when closing server', async () => {
      const error = new Error('Close failed');
      const closeSpy = jest.fn().mockRejectedValue(error);
      const mockSession = {
        lastActivity: Date.now(),
        server: { close: closeSpy },
      } as any as McpSession;

      sessionManager.set('session-1', mockSession);

      await sessionManager.delete('session-1');

      expect(logErrorSpy).toHaveBeenCalledWith('[MCP] Error closing server for session', {
        sessionId: 'session-1',
        error: 'Close failed',
      });
      expect(sessionManager.get('session-1')).toBeUndefined();
    });

    test('should do nothing if session does not exist', async () => {
      await sessionManager.delete('non-existent');

      expect(logErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('hasReachedMaxSessions', () => {
    test('should return false when below max sessions', () => {
      expect(sessionManager.hasReachedMaxSessions()).toBe(false);
    });

    test('should return true when at max sessions', () => {
      const maxSessions = mockConfig.maxSessions;
      for (
        let i = 0;
        i < maxSessions;
        // eslint-disable-next-line no-plusplus
        i++
      ) {
        sessionManager.set(`session-${i}`, {
          lastActivity: Date.now(),
        } as any as McpSession);
      }

      expect(sessionManager.hasReachedMaxSessions()).toBe(true);
    });
  });

  describe('size', () => {
    test('should return the number of active sessions', () => {
      expect(sessionManager.size).toBe(0);

      sessionManager.set('session-1', { lastActivity: Date.now() } as any as McpSession);
      expect(sessionManager.size).toBe(1);

      sessionManager.set('session-2', { lastActivity: Date.now() } as any as McpSession);
      expect(sessionManager.size).toBe(2);
    });
  });

  describe('cleanupIdleSessions', () => {
    test('should remove idle sessions', () => {
      const now = Date.now();
      const idleTime = mockConfig.sessionIdleTimeoutMs + 1000;

      const activeSession = {
        lastActivity: now,
        server: { close: jest.fn() },
      } as any as McpSession;

      const idleSession = {
        lastActivity: now - idleTime,
        server: { close: jest.fn().mockResolvedValue(undefined) },
      } as any as McpSession;

      sessionManager.set('active', activeSession);
      sessionManager.set('idle', idleSession);

      const expired = sessionManager.cleanupIdleSessions();

      expect(expired).toEqual(['idle']);
      expect(sessionManager.get('active')).toBe(activeSession);
      expect(sessionManager.get('idle')).toBeUndefined();
    });

    test('should handle errors when closing idle sessions', () => {
      const now = Date.now();
      const idleTime = mockConfig.sessionIdleTimeoutMs + 1000;

      const idleSession = {
        lastActivity: now - idleTime,
        server: { close: jest.fn().mockRejectedValue(new Error('Close failed')) },
      } as any as McpSession;

      sessionManager.set('idle', idleSession);

      const expired = sessionManager.cleanupIdleSessions();

      expect(expired).toEqual(['idle']);
      expect(sessionManager.get('idle')).toBeUndefined();
    });
  });

  describe('closeAllSessions', () => {
    test('should close all sessions successfully', async () => {
      const closeSpy1 = jest.fn().mockResolvedValue(undefined);
      const closeSpy2 = jest.fn().mockResolvedValue(undefined);

      sessionManager.set('session-1', {
        server: { close: closeSpy1 },
        transport: { close: jest.fn().mockResolvedValue(undefined) },
      } as any as McpSession);

      sessionManager.set('session-2', {
        server: { close: closeSpy2 },
        transport: { close: jest.fn().mockResolvedValue(undefined) },
      } as any as McpSession);

      const result = await sessionManager.closeAllSessions();

      expect(result.hasErrors).toBe(false);
      expect(result.erroredSessionMessages).toEqual([]);
      expect(sessionManager.size).toBe(0);
    });

    test('should handle errors when closing sessions', async () => {
      const serverError = new Error('Server close failed');
      const transportError = new Error('Transport close failed');

      sessionManager.set('session-1', {
        server: { close: jest.fn().mockRejectedValue(serverError) },
        transport: { close: jest.fn().mockRejectedValue(transportError) },
      } as any as McpSession);

      const result = await sessionManager.closeAllSessions();

      expect(result.hasErrors).toBe(true);
      expect(result.erroredSessionMessages.length).toBe(1);
      expect(result.erroredSessionMessages[0]).toContain('session-1');
      expect(result.erroredSessionMessages[0]).toContain('Transport error');
      expect(result.erroredSessionMessages[0]).toContain('Server error');
      expect(sessionManager.size).toBe(0);
    });
  });
});
