import { act, renderHook } from '@testing-library/react';

import {
  useIdleSessionLogout,
  SESSION_EXPIRY_BUFFER_MS,
  SESSION_RENEW_MARGIN_MS,
} from '../useIdleSessionLogout';

/**
 * Build a JWT-shaped string whose payload encodes `{ exp: <expSeconds> }`.
 * We don't care about the header/signature segments here — the decoder
 * doesn't read them.
 */
const buildJwt = (expSeconds: number): string => {
  const json = JSON.stringify({ exp: expSeconds });
  const base64url = window.btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64url}.signature`;
};

const ACCESS_TOKEN_LIFESPAN_MS = 30_000;
const NOW_MS = 1_700_000_000_000;
// When the renew timer (which fires ahead of expiry) runs. Active tabs renew /
// idle tabs re-sync at this point, before the logout timer.
const RENEW_AT_MS = ACCESS_TOKEN_LIFESPAN_MS - SESSION_RENEW_MARGIN_MS;

describe('useIdleSessionLogout', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW_MS });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules a one-shot logout at the access token exp', () => {
    const onExpired = jest.fn();
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() => useIdleSessionLogout({ token, onExpired }));

    expect(onExpired).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('fires immediately when the token is already past exp', () => {
    const onExpired = jest.fn();
    const token = buildJwt((NOW_MS - 5_000) / 1000);

    renderHook(() => useIdleSessionLogout({ token, onExpired }));

    /**
     * `setTimeout(fn, 0)` doesn't run synchronously, so we still need to
     * advance the clock by a tick. The point of the test is that the timer
     * is scheduled with a non-negative delay rather than being skipped.
     */
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('reschedules to the new exp when the token is refreshed', () => {
    const onExpired = jest.fn();

    /**
     * Initial token: expires at NOW + 30s.
     * After 20s of "user activity" we simulate a 401-triggered refresh
     * (handled in `withTokenRefresh`) by passing a new token whose `exp`
     * is later. The hook should clear the original timer and schedule a
     * new one against the later `exp`. If the reschedule logic is broken,
     * `onExpired` would fire when the original `exp` elapses.
     */
    const initialToken = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    const { rerender } = renderHook(
      ({ token }: { token: string }) => useIdleSessionLogout({ token, onExpired }),
      { initialProps: { token: initialToken } }
    );

    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    expect(onExpired).not.toHaveBeenCalled();

    /**
     * Refresh: new token expires 30s from "now" (NOW + 20_000 + 30_000).
     * Original `exp` would have been NOW + 30_000, i.e. 10s away. After
     * rerender, the reschedule should push the deadline out by 20s beyond
     * the original.
     */
    const refreshedToken = buildJwt((NOW_MS + 20_000 + ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    rerender({ token: refreshedToken });

    /**
     * Advance past the *original* exp deadline. If reschedule is broken the
     * old timer would fire here.
     */
    act(() => {
      jest.advanceTimersByTime(15_000);
    });
    expect(onExpired).not.toHaveBeenCalled();

    /**
     * Advance the rest of the way to the new exp + buffer. Total elapsed at
     * this point is 20_000 + 15_000 + 15_000 + buffer = 50s + buffer, which
     * is exactly 30s past "now" from the refresh point.
     */
    act(() => {
      jest.advanceTimersByTime(15_000 + SESSION_EXPIRY_BUFFER_MS);
    });
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending timer when the token is cleared (logout)', () => {
    const onExpired = jest.fn();
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    const { rerender } = renderHook(
      ({ token }: { token: string | null }) => useIdleSessionLogout({ token, onExpired }),
      { initialProps: { token } as { token: string | null } }
    );

    rerender({ token: null });

    act(() => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(onExpired).not.toHaveBeenCalled();
  });

  it('does not schedule a timer when disabled', () => {
    const onExpired = jest.fn();
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() => useIdleSessionLogout({ token, onExpired, disabled: true }));

    act(() => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(onExpired).not.toHaveBeenCalled();
  });

  it('does not schedule a timer when the token is malformed', () => {
    const onExpired = jest.fn();

    renderHook(() => useIdleSessionLogout({ token: 'not-a-jwt', onExpired }));

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(onExpired).not.toHaveBeenCalled();
  });

  it('re-syncs instead of expiring when another tab refreshed the shared token', () => {
    const onExpired = jest.fn();
    const onResync = jest.fn();

    // In-memory token expires at NOW + 30s.
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    // Another tab refreshed: the shared token in storage has a later exp.
    const storedToken = buildJwt((NOW_MS + 5 * ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    const getStoredToken = jest.fn(() => storedToken);

    renderHook(() => useIdleSessionLogout({ token, onExpired, getStoredToken, onResync }));

    // Advance to the renew timer (ahead of expiry). The idle tab spots the
    // active sibling's fresher token and adopts it. In a real app the resulting
    // setToken re-renders and cancels the logout timer; here we stop before it.
    act(() => {
      jest.advanceTimersByTime(RENEW_AT_MS + 1);
    });

    expect(onResync).toHaveBeenCalledTimes(1);
    expect(onResync).toHaveBeenCalledWith(storedToken);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('expires when the stored token is not newer than the in-memory token', () => {
    const onExpired = jest.fn();
    const onResync = jest.fn();

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    // No tab refreshed: storage holds the same (now-expired) token.
    const getStoredToken = jest.fn(() => token);

    renderHook(() => useIdleSessionLogout({ token, onExpired, getStoredToken, onResync }));

    act(() => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(onResync).not.toHaveBeenCalled();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('expires when storage has a stale token with an earlier exp', () => {
    const onExpired = jest.fn();
    const onResync = jest.fn();

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    // Storage somehow holds an older token (e.g. a stale write); never re-sync
    // to an earlier exp.
    const staleToken = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS / 2) / 1000);
    const getStoredToken = jest.fn(() => staleToken);

    renderHook(() => useIdleSessionLogout({ token, onExpired, getStoredToken, onResync }));

    act(() => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(onResync).not.toHaveBeenCalled();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('expires (legacy behavior) when no cross-tab callbacks are provided', () => {
    const onExpired = jest.fn();
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() => useIdleSessionLogout({ token, onExpired }));

    act(() => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('silently renews instead of logging out when the user was active', async () => {
    const onExpired = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    // Activity recorded after the timer is armed (i.e. during the token's life).
    const getLastActivityAt = jest.fn(() => NOW_MS + 10_000);

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() => useIdleSessionLogout({ token, onExpired, getLastActivityAt, renewSession }));

    // Renewal happens ahead of expiry; stop before the logout timer.
    await act(async () => {
      jest.advanceTimersByTime(RENEW_AT_MS + 1);
    });

    expect(renewSession).toHaveBeenCalledTimes(1);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('logs out (idle) when there was no activity during the token lifetime', async () => {
    const onExpired = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    // Last activity predates the arm time → idle.
    const getLastActivityAt = jest.fn(() => NOW_MS - 5_000);

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() => useIdleSessionLogout({ token, onExpired, getLastActivityAt, renewSession }));

    await act(async () => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(renewSession).not.toHaveBeenCalled();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('calls onSessionDead (global) when an active renewal is rejected by the server', async () => {
    const onExpired = jest.fn();
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(false);
    const getLastActivityAt = jest.fn(() => NOW_MS + 10_000);

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() =>
      useIdleSessionLogout({ token, onExpired, onSessionDead, getLastActivityAt, renewSession })
    );

    await act(async () => {
      jest.advanceTimersByTime(RENEW_AT_MS + 1);
      // Flush the renewSession promise chain.
      await Promise.resolve();
    });

    expect(renewSession).toHaveBeenCalledTimes(1);
    expect(onSessionDead).toHaveBeenCalledTimes(1);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('prefers cross-tab re-sync over renewal when a newer shared token exists', async () => {
    const onExpired = jest.fn();
    const onResync = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    const getLastActivityAt = jest.fn(() => NOW_MS + 10_000);

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    const storedToken = buildJwt((NOW_MS + 5 * ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    const getStoredToken = jest.fn(() => storedToken);

    renderHook(() =>
      useIdleSessionLogout({
        token,
        onExpired,
        getStoredToken,
        onResync,
        getLastActivityAt,
        renewSession,
      })
    );

    await act(async () => {
      jest.advanceTimersByTime(RENEW_AT_MS + 1);
    });

    expect(onResync).toHaveBeenCalledWith(storedToken);
    expect(renewSession).not.toHaveBeenCalled();
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('cancels the pending timer on unmount', () => {
    const onExpired = jest.fn();
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    const { unmount } = renderHook(() => useIdleSessionLogout({ token, onExpired }));

    unmount();

    act(() => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(onExpired).not.toHaveBeenCalled();
  });
});
