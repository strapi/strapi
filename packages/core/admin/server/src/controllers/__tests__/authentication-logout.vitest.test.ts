import { describe, test, expect, beforeEach, vi } from 'vitest';

import authentication from '../authentication';

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
  let detached: boolean;

  const createContext = (body: Record<string, unknown> = {}) => ({
    request: { body, secure: false },
    state: { user: { id: 3 }, session: { id: 'session-1' } },
    cookies: { set: vi.fn() },
    body: undefined as unknown,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    detached = false;

    const runWithoutAbortSignal = vi.fn(async (cb: () => Promise<unknown>) => {
      detached = true;
      try {
        return await cb();
      } finally {
        detached = false;
      }
    });

    invalidateRefreshToken.mockImplementation(async () => {
      expect(detached).toBe(true);
    });
    resolveLogoutDeviceId.mockImplementation(async () => {
      expect(detached).toBe(true);
      return 'device-resolved';
    });

    global.strapi = {
      db: { runWithoutAbortSignal },
      eventHub: { emit: vi.fn() },
      log: { error: vi.fn() },
    } as any;
  });

  test('revokes every session detached from the request abort signal', async () => {
    const ctx = createContext();

    await authentication.logout(ctx as any);

    expect(strapi.db.runWithoutAbortSignal).toHaveBeenCalledTimes(1);
    expect(invalidateRefreshToken).toHaveBeenCalledWith('3');
    expect(strapi.log.error).not.toHaveBeenCalled();
    expect(ctx.body).toEqual({ data: {} });
  });

  test('resolves the device and revokes it detached from the request abort signal', async () => {
    const ctx = createContext({ deviceId: 'device-1' });

    await authentication.logout(ctx as any);

    expect(resolveLogoutDeviceId).toHaveBeenCalledWith('3', 'session-1', 'device-1');
    expect(invalidateRefreshToken).toHaveBeenCalledWith('3', 'device-resolved');
    expect(strapi.log.error).not.toHaveBeenCalled();
  });
});
