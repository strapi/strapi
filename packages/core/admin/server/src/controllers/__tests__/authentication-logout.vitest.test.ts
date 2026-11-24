import { describe, test, expect, beforeEach, vi } from 'vitest';

import authentication from '../authentication';
import routes from '../../routes/authentication';

const invalidateRefreshToken = vi.hoisted(() => vi.fn(async () => {}));
const resolveLogoutDeviceId = vi.hoisted(() => vi.fn(async () => 'device-resolved'));

vi.mock('../../../../shared/utils/session-auth', async () => ({
  ...(await vi.importActual<object>('../../../../shared/utils/session-auth')),
  getSessionManager: () => () => ({ invalidateRefreshToken }),
  getRefreshCookieOptions: () => ({}),
  resolveLogoutDeviceId,
}));

vi.mock('../../utils', () => ({
  getService: () => ({ sanitizeUser: (user: unknown) => user }),
}));

describe('Authentication controller, logout', () => {
  const createContext = (body: Record<string, unknown> = {}) => ({
    request: { body, secure: false },
    state: { user: { id: 3 }, session: { id: 'session-1' } },
    cookies: { set: vi.fn() },
    body: undefined as unknown,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    global.strapi = {
      eventHub: { emit: vi.fn() },
      log: { error: vi.fn() },
    } as any;
  });

  test('revokes every session', async () => {
    const ctx = createContext();

    await authentication.logout(ctx as any);

    expect(invalidateRefreshToken).toHaveBeenCalledWith('3');
    expect(strapi.log.error).not.toHaveBeenCalled();
    expect(ctx.body).toEqual({ data: {} });
  });

  test('resolves the device and revokes it', async () => {
    const ctx = createContext({ deviceId: 'device-1' });

    await authentication.logout(ctx as any);

    expect(resolveLogoutDeviceId).toHaveBeenCalledWith('3', 'session-1', 'device-1');
    expect(invalidateRefreshToken).toHaveBeenCalledWith('3', 'device-resolved');
    expect(strapi.log.error).not.toHaveBeenCalled();
  });

  test('the logout route keeps its reads running after the client disconnects', () => {
    const logoutRoute = routes.find((route) => route.path === '/logout');

    expect(logoutRoute?.config?.abortReadsOnRequestDisconnect).toBe(false);
  });
});
