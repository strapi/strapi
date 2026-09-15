import * as React from 'react';

import { decodeAccessTokenExpiry } from '../utils/jwt';

const SESSION_EXPIRY_BUFFER_MS = 1000;
/**
 * How long before the access token's `exp` an active tab renews. Renewing
 * ahead of expiry (rather than at it) means the refreshed token is already in
 * shared storage by the time any *other* tab's post-expiry timer fires — so an
 * idle sibling re-syncs instead of racing the refresh.
 */
const SESSION_RENEW_MARGIN_MS = 10_000;

interface UseSessionKeepaliveOptions {
  /**
   * The current admin access JWT (from Redux), or `null` when logged out.
   */
  token: string | null;
  /**
   * Called when a renewal attempt is rejected by the server (the session is
   * truly over: refresh token idle/max window elapsed). This is a
   * server-confirmed end of session, so it SHOULD broadcast a global logout to
   * every tab.
   */
  onSessionDead?: () => void;
  /**
   * Read the access token currently in shared storage (localStorage/cookie).
   * Because every open tab shares the same refresh cookie, an active tab that
   * refreshes writes a newer access token here. When omitted, the hook never
   * re-syncs across tabs.
   */
  getStoredToken?: () => string | null;
  /**
   * Adopt a newer shared token instead of treating this tab's token as stale.
   * Typically dispatches `setToken`, which updates Redux and causes this hook
   * to re-arm against the later `exp`. Only called when `getStoredToken`
   * returns a token whose `exp` is later than the in-memory one.
   */
  onResync?: (token: string) => void;
  /**
   * Epoch ms of the user's last interaction (pointer, key, scroll, …). Used to
   * decide whether to silently renew when the access token is about to expire.
   * Idle tabs must NOT renew — that would defeat the server's
   * `idleSessionLifespan` / `idleRefreshTokenLifespan`. When omitted, the hook
   * never treats the tab as active.
   */
  getLastActivityAt?: () => number;
  /**
   * Silently renew the session (rotate the refresh token + mint a new access
   * token). Resolves `true` on success — the resulting `setToken` re-arms this
   * hook against the new `exp` — or `false` when the server rejects it. Only
   * called when the user was active during the current token's lifetime.
   */
  renewSession?: () => Promise<boolean>;
  /**
   * Escape hatch for tests / dev environments where we don't want the
   * automatic renew / re-sync behavior. Mirrors the existing `_disableRenewToken`
   * prop on `<AuthProvider>`.
   */
  disabled?: boolean;
}

/**
 * Keep the admin session alive while the user is active — without one tab
 * tearing down another, and without logging anyone out because a short-lived
 * access token aged out.
 *
 * The access token (`accessTokenLifespan`, e.g. 30 min) is transport plumbing,
 * not the session length; the refresh token's idle/max window is the session.
 * So expiry of the access JWT must never clear auth state or unmount the page:
 * the next user-initiated request 401s, `withTokenRefresh` refreshes and
 * retries, and only a *rejected* refresh ends the session (`onSessionDead`).
 * Two timers are armed per token:
 *
 * - Renew (at `exp` minus a margin): if the user interacted during this token's
 *   lifetime, silently renew *ahead* of expiry. The new `setToken` re-arms the
 *   hook; a server rejection (`onSessionDead`) ends the session globally.
 *   Renewing early guarantees the refreshed token reaches shared storage before
 *   any sibling tab's post-expiry timer fires.
 * - Post-expiry (just after `exp`): the fallback when this tab did not renew.
 *   It first re-syncs from a token another tab refreshed (so an idle tab rides
 *   on an active sibling), then renews if activity arrived late. If the tab is
 *   still idle, it does nothing destructive — the stale access token stays in
 *   place so form state survives until the next request.
 *
 * Idle tabs must not renew: a tab left open forever must not keep the session
 * alive past the server's idle/max window.
 *
 * If the JWT can't be decoded (malformed, missing `exp`), the timers are skipped
 * silently — the 401 refresh path still covers the next user-initiated request.
 */
const useSessionKeepalive = ({
  token,
  onSessionDead,
  getStoredToken,
  onResync,
  getLastActivityAt,
  renewSession,
  disabled = false,
}: UseSessionKeepaliveOptions): void => {
  React.useEffect(() => {
    if (!token || disabled) {
      return undefined;
    }

    const expiry = decodeAccessTokenExpiry(token);
    if (expiry === null) {
      return undefined;
    }

    // When this token became active. Activity recorded after this point means
    // the user was present during the token's lifetime.
    const armedAt = Date.now();
    const wasActive = () =>
      typeof getLastActivityAt === 'function' && getLastActivityAt() >= armedAt;

    // Adopt a fresher token another tab wrote to shared storage. Returns true
    // when it re-synced (caller should stop).
    const tryResync = (): boolean => {
      const storedToken = getStoredToken?.() ?? null;
      if (storedToken && storedToken !== token && onResync) {
        const storedExpiry = decodeAccessTokenExpiry(storedToken);
        if (storedExpiry !== null && storedExpiry > expiry) {
          onResync(storedToken);
          return true;
        }
      }
      return false;
    };

    const renew = () => {
      renewSession!().then((renewed) => {
        if (!renewed) {
          // Server rejected the refresh: the session is truly over.
          onSessionDead?.();
        }
        // On success, storeToken -> setToken updates the token prop, which
        // re-runs this effect and re-arms against the new exp.
      });
    };

    // Renew ahead of expiry while the user is active.
    const renewDelay = Math.max(expiry - armedAt - SESSION_RENEW_MARGIN_MS, 0);
    const renewTimeoutId = window.setTimeout(() => {
      if (tryResync()) {
        return;
      }
      if (wasActive() && renewSession) {
        renew();
      }
    }, renewDelay);

    // Fallback just after expiry for tabs that did not renew: re-sync or
    // late-activity renew. Idle tabs leave the stale token alone.
    const postExpiryDelay = Math.max(expiry - armedAt + SESSION_EXPIRY_BUFFER_MS, 0);
    const postExpiryTimeoutId = window.setTimeout(() => {
      if (tryResync()) {
        return;
      }
      if (wasActive() && renewSession) {
        renew();
      }
      // Genuinely idle: do nothing. Keep the (stale) access token and the page
      // mounted. The next request will 401 and either refresh transparently or
      // hit the session-dead path if the server rejects the refresh.
    }, postExpiryDelay);

    return () => {
      window.clearTimeout(renewTimeoutId);
      window.clearTimeout(postExpiryTimeoutId);
    };
  }, [token, onSessionDead, getStoredToken, onResync, getLastActivityAt, renewSession, disabled]);
};

export { useSessionKeepalive, SESSION_EXPIRY_BUFFER_MS, SESSION_RENEW_MARGIN_MS };
export type { UseSessionKeepaliveOptions };
