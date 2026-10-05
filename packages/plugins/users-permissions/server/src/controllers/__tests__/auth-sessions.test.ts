import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import auth from '../auth';
import { createStrapiMock } from '../../../tests/utils';
import { createMockContext } from './utils';

const createContext = <T extends object>({ params = {}, query = {}, body = {} }, overrides: T) =>
  createMockContext({
    params,
    query,
    request: { query, body },
    ...overrides,
  });

const createFixture = () => {
  const originApi = {
    listSessions: vi.fn().mockResolvedValue([]),
    revokeSessionById: vi.fn().mockResolvedValue(true),
    validateRefreshToken: vi.fn(),
    invalidateRefreshToken: vi.fn().mockResolvedValue(undefined),
  };
  const strapi = createStrapiMock({
    config: {
      get: vi.fn((path: string, defaultValue?: unknown) => {
        if (path === 'plugin::users-permissions.jwtManagement') return 'refresh';
        if (path === 'plugin::users-permissions.sessions') return { httpOnly: false };
        return defaultValue;
      }),
    },
    sessionManager: vi.fn(() => originApi),
    log: { error: vi.fn() },
  });
  return { strapi, originApi, controller: auth({ strapi }) };
};

describe('Auth controller - sessions', () => {
  let controller: ReturnType<typeof auth>;
  let strapi: ReturnType<typeof createFixture>['strapi'];
  let originApi: ReturnType<typeof createFixture>['originApi'];

  beforeEach(() => {
    ({ strapi, originApi, controller } = createFixture());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getSessions', () => {
    test('Returns 404 outside refresh mode', async () => {
      strapi.config.get.mockImplementation((path, defaultValue) => {
        if (path === 'plugin::users-permissions.jwtManagement') {
          return 'legacy-support';
        }
        return defaultValue;
      });

      const notFound = vi.fn();
      const ctx = createContext({}, { notFound, state: { user: { id: 1 } } });

      await controller.getSessions(ctx);

      expect(notFound).toHaveBeenCalled();
    });

    test('Requires authentication', async () => {
      const unauthorized = vi.fn();
      const ctx = createContext({}, { unauthorized, state: {} });

      await controller.getSessions(ctx);

      expect(unauthorized).toHaveBeenCalledWith('Missing authentication');
    });

    test('Returns sanitized sessions with the current session flagged', async () => {
      originApi.listSessions.mockResolvedValue([
        {
          sessionId: 'session-other',
          deviceId: 'device-b',
          createdAt: '2026-06-10T09:00:00.000Z',
          metadata: {
            loginAt: '2026-06-09T08:00:00.000Z',
            deviceName: 'Safari',
          },
        },
        {
          sessionId: 'session-current',
          deviceId: 'device-a',
          createdAt: '2026-06-11T10:00:00.000Z',
          metadata: {
            loginAt: '2026-06-10T08:00:00.000Z',
            deviceName: 'Chrome',
          },
        },
      ]);

      const send = vi.fn();
      const ctx = createContext(
        {},
        {
          send,
          state: {
            user: { id: 42 },
            session: { id: 'session-current' },
          },
        }
      );

      await controller.getSessions(ctx);

      expect(originApi.listSessions).toHaveBeenCalledWith('42');
      expect(send).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            id: 'session-current',
            current: true,
            deviceName: 'Chrome',
          }),
          expect.objectContaining({
            id: 'session-other',
            current: false,
            deviceName: 'Safari',
          }),
        ],
      });
    });
  });

  describe('revokeSession', () => {
    test('Returns 404 outside refresh mode', async () => {
      strapi.config.get.mockImplementation((path, defaultValue) => {
        if (path === 'plugin::users-permissions.jwtManagement') {
          return 'legacy-support';
        }
        return defaultValue;
      });

      const notFound = vi.fn();
      const ctx = createContext(
        {},
        {
          notFound,
          params: { sessionId: 'session-1' },
          state: { user: { id: 1 } },
        }
      );

      await controller.revokeSession(ctx);

      expect(notFound).toHaveBeenCalled();
    });

    test('Requires authentication', async () => {
      const unauthorized = vi.fn();
      const ctx = createContext(
        {},
        { unauthorized, state: {}, params: { sessionId: 'session-1' } }
      );

      await controller.revokeSession(ctx);

      expect(unauthorized).toHaveBeenCalledWith('Missing authentication');
    });

    test('Returns 404 when the session does not exist', async () => {
      originApi.revokeSessionById.mockResolvedValue(false);

      const notFound = vi.fn();
      const ctx = createContext(
        {},
        {
          notFound,
          params: { sessionId: 'missing' },
          state: { user: { id: 42 } },
        }
      );

      await controller.revokeSession(ctx);

      expect(originApi.revokeSessionById).toHaveBeenCalledWith('42', 'missing');
      expect(notFound).toHaveBeenCalledWith('Session not found');
    });

    test('Revokes the requested session', async () => {
      const send = vi.fn();
      const ctx = createContext(
        {},
        {
          send,
          params: { sessionId: 'session-1' },
          state: { user: { id: 42 } },
        }
      );

      await controller.revokeSession(ctx);

      expect(originApi.revokeSessionById).toHaveBeenCalledWith('42', 'session-1');
      expect(send).toHaveBeenCalledWith({ data: {} });
    });
  });

  describe('logout', () => {
    const createLogoutContext = (overrides = {}) =>
      createContext(
        {},
        {
          send: vi.fn(),
          state: { user: { id: 5 }, session: { id: 'session-current' } },
          cookies: {
            get: vi.fn(),
            set: vi.fn(),
          },
          request: {
            body: {},
            header: {},
          },
          ...overrides,
        }
      );

    test('Returns 404 outside refresh mode', async () => {
      strapi.config.get.mockImplementation((path, defaultValue) => {
        if (path === 'plugin::users-permissions.jwtManagement') {
          return 'legacy-support';
        }
        return defaultValue;
      });

      const notFound = vi.fn();
      const ctx = createLogoutContext({ notFound });

      await controller.logout(ctx);

      expect(notFound).toHaveBeenCalled();
    });

    test('Requires authentication', async () => {
      const unauthorized = vi.fn();
      const ctx = createLogoutContext({ unauthorized, state: {} });

      await controller.logout(ctx);

      expect(unauthorized).toHaveBeenCalledWith('Missing authentication');
    });

    test('Revokes every session when scope is all', async () => {
      const ctx = createLogoutContext({
        request: { body: { scope: 'all' }, header: {} },
      });

      await controller.logout(ctx);

      expect(originApi.invalidateRefreshToken).toHaveBeenCalledWith('5');
      expect(originApi.revokeSessionById).not.toHaveBeenCalled();
      expect(ctx.send).toHaveBeenCalledWith({ ok: true });
    });

    test('Revokes a device family when deviceId is provided', async () => {
      const ctx = createLogoutContext({
        request: { body: { deviceId: 'device-123' }, header: {} },
      });

      await controller.logout(ctx);

      expect(originApi.invalidateRefreshToken).toHaveBeenCalledWith('5', 'device-123');
      expect(originApi.revokeSessionById).not.toHaveBeenCalled();
    });

    test('Revokes only the current session by default', async () => {
      const ctx = createLogoutContext();

      await controller.logout(ctx);

      expect(originApi.revokeSessionById).toHaveBeenCalledWith('5', 'session-current');
      expect(originApi.invalidateRefreshToken).not.toHaveBeenCalled();
    });

    test('Resolves the current session from the refresh token when needed', async () => {
      originApi.validateRefreshToken.mockResolvedValue({
        isValid: true,
        sessionId: 'session-from-token',
      });

      const ctx = createLogoutContext({
        state: { user: { id: 5 } },
        cookies: {
          get: vi.fn(() => 'refresh-token'),
          set: vi.fn(),
        },
      });

      await controller.logout(ctx);

      expect(originApi.validateRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(originApi.revokeSessionById).toHaveBeenCalledWith('5', 'session-from-token');
    });

    test('Falls back to a full logout when the current session cannot be identified', async () => {
      const ctx = createLogoutContext({
        state: { user: { id: 5 } },
      });

      await controller.logout(ctx);

      expect(originApi.invalidateRefreshToken).toHaveBeenCalledWith('5');
      expect(originApi.revokeSessionById).not.toHaveBeenCalled();
    });

    test('Uses the body refresh token when a cookie is absent', async () => {
      originApi.validateRefreshToken.mockResolvedValue({
        isValid: true,
        sessionId: 'body-session',
      });
      const ctx = createLogoutContext({
        state: { user: { id: 5 } },
        request: { body: { refreshToken: 'body-token' }, header: {} },
      });
      await controller.logout(ctx);
      expect(originApi.validateRefreshToken).toHaveBeenCalledWith('body-token');
      expect(originApi.revokeSessionById).toHaveBeenCalledWith('5', 'body-session');
    });

    test('Completes logout and logs session revocation errors', async () => {
      const error = new Error('Session store unavailable');
      originApi.revokeSessionById.mockRejectedValue(error);
      const ctx = createLogoutContext();
      await controller.logout(ctx);
      expect(strapi.log.error).toHaveBeenCalledWith('UP logout failed', error);
      expect(ctx.send).toHaveBeenCalledWith({ ok: true });
    });

    test('Clears the refresh cookie when httpOnly sessions are enabled', async () => {
      strapi.config.get.mockImplementation((path, defaultValue) => {
        if (path === 'plugin::users-permissions.jwtManagement') {
          return 'refresh';
        }
        if (path === 'plugin::users-permissions.sessions') {
          return {
            httpOnly: true,
            cookie: {
              name: 'custom_refresh',
              path: '/custom-path',
              domain: 'example.com',
              sameSite: 'strict',
              secure: true,
              maxAge: 3600000,
            },
          };
        }
        return defaultValue;
      });

      const ctx = createLogoutContext({
        cookies: {
          get: vi.fn(),
          set: vi.fn(),
        },
      });

      await controller.logout(ctx);

      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'custom_refresh',
        '',
        expect.objectContaining({
          path: '/custom-path',
          domain: 'example.com',
          sameSite: 'strict',
          secure: true,
          expires: expect.any(Date),
        })
      );
      expect(ctx.cookies.set.mock.calls[0][2]).not.toHaveProperty('maxAge');
    });
  });
});
