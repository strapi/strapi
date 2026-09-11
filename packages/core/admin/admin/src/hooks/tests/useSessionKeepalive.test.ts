import { act, renderHook } from '@testing-library/react';

import {
  useSessionKeepalive,
  SESSION_EXPIRY_BUFFER_MS,
  SESSION_RENEW_MARGIN_MS,
} from '../useSessionKeepalive';

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
// idle tabs re-sync at this point, before the post-expiry timer.
const RENEW_AT_MS = ACCESS_TOKEN_LIFESPAN_MS - SESSION_RENEW_MARGIN_MS;

describe('useSessionKeepalive', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW_MS });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing destructive when an idle access token expires', () => {
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    // Last activity predates the arm time → idle.
    const getLastActivityAt = jest.fn(() => NOW_MS - 5_000);
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() =>
      useSessionKeepalive({ token, onSessionDead, getLastActivityAt, renewSession })
    );

    act(() => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(renewSession).not.toHaveBeenCalled();
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('runs the post-expiry path immediately when the token is already past exp', () => {
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    const getLastActivityAt = jest.fn(() => NOW_MS - 5_000);
    const token = buildJwt((NOW_MS - 5_000) / 1000);

    renderHook(() =>
      useSessionKeepalive({ token, onSessionDead, getLastActivityAt, renewSession })
    );

    /**
     * `setTimeout(fn, 0)` doesn't run synchronously, so we still need to
     * advance the clock by a tick. The point of the test is that the timer
     * is scheduled with a non-negative delay rather than being skipped —
     * and idle expiry still must not call onSessionDead.
     */
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(renewSession).not.toHaveBeenCalled();
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('reschedules to the new exp when the token is refreshed', async () => {
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    // Keep the tab "active" so a broken reschedule would renew against the
    // *old* deadline.
    const getLastActivityAt = jest.fn(() => NOW_MS + 100_000);

    /**
     * Initial token: expires at NOW + 30s (renew-ahead at +20s).
     * After 10s we simulate a 401-triggered refresh by passing a new token
     * whose `exp` is later. The hook should clear the original timers and
     * schedule against the later `exp`.
     */
    const initialToken = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    const { rerender } = renderHook(
      ({ token }: { token: string }) =>
        useSessionKeepalive({ token, onSessionDead, getLastActivityAt, renewSession }),
      { initialProps: { token: initialToken } }
    );

    // Stop before the original renew-ahead timer (RENEW_AT_MS = 20s).
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(renewSession).not.toHaveBeenCalled();

    /**
     * Refresh: new token expires 30s from "now" (NOW + 10_000 + 30_000).
     * Original renew-at was NOW + 20_000 (10s away). New renew-at is
     * NOW + 10_000 + 20_000 = NOW + 30_000.
     */
    const refreshedToken = buildJwt((NOW_MS + 10_000 + ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    rerender({ token: refreshedToken });

    /**
     * Advance past the *original* renew deadline (+10s more → NOW + 20s).
     * If reschedule is broken the old renew timer would fire here.
     */
    await act(async () => {
      jest.advanceTimersByTime(10_000 + 1);
    });
    expect(renewSession).not.toHaveBeenCalled();

    /**
     * Advance to the new renew-at (another ~10s). From refresh arm point the
     * renew delay is ACCESS_TOKEN_LIFESPAN - MARGIN = 20s; we already spent
     * 10s after refresh, so ~10s more reaches it.
     */
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(renewSession).toHaveBeenCalledTimes(1);
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('cancels the pending timers when the token is cleared (logout)', async () => {
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    const getLastActivityAt = jest.fn(() => NOW_MS + 10_000);
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    const { rerender } = renderHook(
      ({ token }: { token: string | null }) =>
        useSessionKeepalive({ token, onSessionDead, getLastActivityAt, renewSession }),
      { initialProps: { token } as { token: string | null } }
    );

    rerender({ token: null });

    await act(async () => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(renewSession).not.toHaveBeenCalled();
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('does not schedule timers when disabled', async () => {
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    const getLastActivityAt = jest.fn(() => NOW_MS + 10_000);
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() =>
      useSessionKeepalive({
        token,
        onSessionDead,
        getLastActivityAt,
        renewSession,
        disabled: true,
      })
    );

    await act(async () => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(renewSession).not.toHaveBeenCalled();
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('does not schedule timers when the token is malformed', async () => {
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);

    renderHook(() => useSessionKeepalive({ token: 'not-a-jwt', onSessionDead, renewSession }));

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(renewSession).not.toHaveBeenCalled();
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('re-syncs instead of renewing when another tab refreshed the shared token', () => {
    const onSessionDead = jest.fn();
    const onResync = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    const getLastActivityAt = jest.fn(() => NOW_MS + 10_000);

    // In-memory token expires at NOW + 30s.
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    // Another tab refreshed: the shared token in storage has a later exp.
    const storedToken = buildJwt((NOW_MS + 5 * ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    const getStoredToken = jest.fn(() => storedToken);

    renderHook(() =>
      useSessionKeepalive({
        token,
        onSessionDead,
        getStoredToken,
        onResync,
        getLastActivityAt,
        renewSession,
      })
    );

    // Advance to the renew timer (ahead of expiry). The idle/active tab spots
    // the sibling's fresher token and adopts it.
    act(() => {
      jest.advanceTimersByTime(RENEW_AT_MS + 1);
    });

    expect(onResync).toHaveBeenCalledTimes(1);
    expect(onResync).toHaveBeenCalledWith(storedToken);
    expect(renewSession).not.toHaveBeenCalled();
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('does not re-sync when the stored token is not newer than the in-memory token', () => {
    const onSessionDead = jest.fn();
    const onResync = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    const getLastActivityAt = jest.fn(() => NOW_MS - 5_000);

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    // No tab refreshed: storage holds the same (now-expired) token.
    const getStoredToken = jest.fn(() => token);

    renderHook(() =>
      useSessionKeepalive({
        token,
        onSessionDead,
        getStoredToken,
        onResync,
        getLastActivityAt,
        renewSession,
      })
    );

    act(() => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(onResync).not.toHaveBeenCalled();
    expect(renewSession).not.toHaveBeenCalled();
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('does not re-sync to a stored token with an earlier exp', () => {
    const onSessionDead = jest.fn();
    const onResync = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    const getLastActivityAt = jest.fn(() => NOW_MS - 5_000);

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    // Storage somehow holds an older token (e.g. a stale write); never re-sync
    // to an earlier exp.
    const staleToken = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS / 2) / 1000);
    const getStoredToken = jest.fn(() => staleToken);

    renderHook(() =>
      useSessionKeepalive({
        token,
        onSessionDead,
        getStoredToken,
        onResync,
        getLastActivityAt,
        renewSession,
      })
    );

    act(() => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(onResync).not.toHaveBeenCalled();
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('silently renews when the user was active (ahead of expiry)', async () => {
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    // Activity recorded after the timer is armed (i.e. during the token's life).
    const getLastActivityAt = jest.fn(() => NOW_MS + 10_000);

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() =>
      useSessionKeepalive({ token, onSessionDead, getLastActivityAt, renewSession })
    );

    // Renewal happens ahead of expiry; stop before the post-expiry timer.
    await act(async () => {
      jest.advanceTimersByTime(RENEW_AT_MS + 1);
    });

    expect(renewSession).toHaveBeenCalledTimes(1);
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('renews at post-expiry when activity arrived after the renew margin', async () => {
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    // No activity yet when renew-ahead fires; activity only later.
    let lastActivity = NOW_MS - 5_000;
    const getLastActivityAt = jest.fn(() => lastActivity);

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() =>
      useSessionKeepalive({ token, onSessionDead, getLastActivityAt, renewSession })
    );

    await act(async () => {
      jest.advanceTimersByTime(RENEW_AT_MS + 1);
    });
    expect(renewSession).not.toHaveBeenCalled();

    // User interacts after the renew-ahead window but before post-expiry.
    lastActivity = NOW_MS + RENEW_AT_MS + 5_000;

    await act(async () => {
      jest.advanceTimersByTime(
        ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS - (RENEW_AT_MS + 1)
      );
    });

    expect(renewSession).toHaveBeenCalledTimes(1);
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('calls onSessionDead (global) when an active renewal is rejected by the server', async () => {
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(false);
    const getLastActivityAt = jest.fn(() => NOW_MS + 10_000);

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    renderHook(() =>
      useSessionKeepalive({ token, onSessionDead, getLastActivityAt, renewSession })
    );

    await act(async () => {
      jest.advanceTimersByTime(RENEW_AT_MS + 1);
      // Flush the renewSession promise chain.
      await Promise.resolve();
    });

    expect(renewSession).toHaveBeenCalledTimes(1);
    expect(onSessionDead).toHaveBeenCalledTimes(1);
  });

  it('prefers cross-tab re-sync over renewal when a newer shared token exists', async () => {
    const onSessionDead = jest.fn();
    const onResync = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    const getLastActivityAt = jest.fn(() => NOW_MS + 10_000);

    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    const storedToken = buildJwt((NOW_MS + 5 * ACCESS_TOKEN_LIFESPAN_MS) / 1000);
    const getStoredToken = jest.fn(() => storedToken);

    renderHook(() =>
      useSessionKeepalive({
        token,
        onSessionDead,
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
    expect(onSessionDead).not.toHaveBeenCalled();
  });

  it('cancels the pending timers on unmount', async () => {
    const onSessionDead = jest.fn();
    const renewSession = jest.fn().mockResolvedValue(true);
    const getLastActivityAt = jest.fn(() => NOW_MS + 10_000);
    const token = buildJwt((NOW_MS + ACCESS_TOKEN_LIFESPAN_MS) / 1000);

    const { unmount } = renderHook(() =>
      useSessionKeepalive({ token, onSessionDead, getLastActivityAt, renewSession })
    );

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(ACCESS_TOKEN_LIFESPAN_MS + SESSION_EXPIRY_BUFFER_MS);
    });

    expect(renewSession).not.toHaveBeenCalled();
    expect(onSessionDead).not.toHaveBeenCalled();
  });
});
