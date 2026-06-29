/* eslint-env jest */

// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import authenticatedSessionController from '../authenticated-session';

const setStrapi = (value: object) => {
  (globalThis as any).strapi = value;
};

const createSessionManager = ({
  listSessions = jest.fn(() => Promise.resolve([])),
  revokeSessionById = jest.fn(() => Promise.resolve(true)),
  invalidateRefreshToken = jest.fn(() => Promise.resolve()),
}: {
  listSessions?: jest.Mock;
  revokeSessionById?: jest.Mock;
  invalidateRefreshToken?: jest.Mock;
} = {}) => {
  const adminOrigin = { listSessions, revokeSessionById, invalidateRefreshToken };
  const sessionManagerFn = jest.fn((origin: string) => {
    if (origin === 'admin') {
      return adminOrigin;
    }

    throw new Error(`Unexpected origin: ${origin}`);
  });

  return { sessionManagerFn, adminOrigin };
};

describe('Authenticated Session Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    test('Returns sanitized sessions sorted for display', async () => {
      const { sessionManagerFn } = createSessionManager({
        listSessions: jest.fn(() =>
          Promise.resolve([
            {
              sessionId: 'session-other',
              deviceId: 'device-b',
              createdAt: '2026-06-11T09:00:00.000Z',
              metadata: { ip: '10.0.0.2', loginAt: '2026-06-10T08:00:00.000Z' },
            },
            {
              sessionId: 'session-current',
              deviceId: 'device-a',
              createdAt: '2026-06-12T10:00:00.000Z',
              metadata: {
                ip: '127.0.0.1',
                loginAt: '2026-06-12T08:00:00.000Z',
                deviceName: 'Chrome on macOS',
              },
            },
          ])
        ),
      });

      setStrapi({ sessionManager: sessionManagerFn });

      const ctx = createContext(
        {},
        {
          state: {
            user: { id: 1 },
            session: { id: 'session-current' },
          },
        }
      ) as any;

      await authenticatedSessionController.list(ctx);

      expect(sessionManagerFn).toHaveBeenCalledWith('admin');
      expect(ctx.body.data).toEqual([
        expect.objectContaining({
          id: 'session-current',
          current: true,
          deviceName: 'Chrome on macOS',
        }),
        expect.objectContaining({
          id: 'session-other',
          current: false,
        }),
      ]);
    });

    test('Returns 500 when session manager is unavailable', async () => {
      setStrapi({});
      const internalServerError = jest.fn();
      const ctx = createContext({}, { internalServerError, state: { user: { id: 1 } } }) as any;

      await authenticatedSessionController.list(ctx);

      expect(internalServerError).toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    test('Revokes a session owned by the current user', async () => {
      const { sessionManagerFn, adminOrigin } = createSessionManager();
      setStrapi({ sessionManager: sessionManagerFn });

      const ctx = createContext(
        {},
        {
          params: { sessionId: 'session-other' },
          state: { user: { id: 42 } },
        }
      ) as any;

      await authenticatedSessionController.revoke(ctx);

      expect(adminOrigin.revokeSessionById).toHaveBeenCalledWith('42', 'session-other');
      expect(ctx.body).toEqual({ data: {} });
    });

    test('Returns 404 when the session does not exist', async () => {
      const { sessionManagerFn } = createSessionManager({
        revokeSessionById: jest.fn(() => Promise.resolve(false)),
      });
      setStrapi({ sessionManager: sessionManagerFn });
      const notFound = jest.fn();

      const ctx = createContext(
        {},
        {
          notFound,
          params: { sessionId: 'missing' },
          state: { user: { id: 42 } },
        }
      ) as any;

      await authenticatedSessionController.revoke(ctx);

      expect(notFound).toHaveBeenCalledWith('Session not found');
    });
  });

  describe('revokeAll', () => {
    test('Invalidates every session by default', async () => {
      const { sessionManagerFn, adminOrigin } = createSessionManager();
      setStrapi({ sessionManager: sessionManagerFn });

      const ctx = createContext({}, { state: { user: { id: 7 } } }) as any;

      await authenticatedSessionController.revokeAll(ctx);

      expect(adminOrigin.invalidateRefreshToken).toHaveBeenCalledWith('7');
      expect(ctx.body).toEqual({ data: {} });
    });

    test('Keeps the current session when keepCurrent=true', async () => {
      const { sessionManagerFn, adminOrigin } = createSessionManager({
        listSessions: jest.fn(() =>
          Promise.resolve([{ sessionId: 'session-current' }, { sessionId: 'session-other' }])
        ),
      });
      setStrapi({ sessionManager: sessionManagerFn });

      const ctx = createContext(
        {},
        {
          query: { keepCurrent: 'true' },
          state: {
            user: { id: 7 },
            session: { id: 'session-current' },
          },
        }
      ) as any;

      await authenticatedSessionController.revokeAll(ctx);

      expect(adminOrigin.invalidateRefreshToken).not.toHaveBeenCalled();
      expect(adminOrigin.revokeSessionById).toHaveBeenCalledWith('7', 'session-other');
      expect(adminOrigin.revokeSessionById).not.toHaveBeenCalledWith('7', 'session-current');
    });
  });
});
