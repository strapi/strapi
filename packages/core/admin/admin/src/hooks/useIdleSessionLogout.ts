import * as React from 'react';

import { decodeAccessTokenExpiry } from '../utils/jwt';

const SESSION_EXPIRY_BUFFER_MS = 1000;
/**
 * How long before the access token's `exp` an active tab renews. Renewing
 * ahead of expiry (rather than at it) means the refreshed token is already in
 * shared storage by the time any *other* tab's logout timer fires — so an idle
 * sibling re-syncs instead of racing the refresh and logging itself out.
 */
const SESSION_RENEW_MARGIN_MS = 10_000;

interface UseIdleSessionLogoutOptions {
  /**
   * The current admin access JWT (from Redux), or `null` when logged out.
   */
  token: string | null;
  /**
   * Called when the timer fires and the user is genuinely idle. Should clear
   * *this tab's* local auth state and navigate to /auth/login. It must NOT
   * broadcast a global logout (e.g. by removing the shared `isLoggedIn` key),
   * otherwise an idle tab firing on a stale token would log out other tabs that
   * are still active — see the cross-tab handling below.
   */
  onExpired: () => void;
  /**
   * Called when a renewal attempt is rejected by the server (the session is
   * truly over: refresh token idle/max window elapsed). This is a
   * server-confirmed end of session, so unlike `onExpired` it SHOULD broadcast
   * a global logout to every tab. Falls back to `onExpired` when omitted.
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
   * Adopt a newer shared token instead of expiring. Typically dispatches
   * `setToken`, which updates Redux and causes this hook to re-arm against the
   * later `exp`. Only called when `getStoredToken` returns a token whose `exp`
   * is later than the in-memory one.
   */
  onResync?: (token: string) => void;
  /**
   * Epoch ms of the user's last interaction (pointer, key, scroll, …). Used to
   * decide whether to silently renew (active) or log out (idle) when the access
   * token expires. When omitted, the hook always treats expiry as idle.
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
   * automatic logout behavior. Mirrors the existing `_disableRenewToken`
   * prop on `<AuthProvider>`.
   */
  disabled?: boolean;
}

/**
 * Keep the admin session alive while the user is active, and end it when they
 * are genuinely idle — without one tab tearing down another.
 *
 * The access token is short-lived (`accessTokenLifespan`, e.g. 30 min) and is
 * meant to be refreshed, not to be the session length. Two timers are armed per
 * token:
 *
 * - Renew (at `exp` minus a margin): if the user interacted during this token's
 *   lifetime, silently renew *ahead* of expiry. The new `setToken` re-arms the
 *   hook; a server rejection (`onSessionDead`) ends the session globally.
 *   Renewing early guarantees the refreshed token reaches shared storage before
 *   any sibling tab's logout timer fires.
 * - Logout (just after `exp`): the fallback when this tab did not renew. It
 *   first re-syncs from a token another tab refreshed (so an idle tab rides on
 *   an active sibling), then renews if activity arrived late, and only otherwise
 *   logs out — locally, so idle tabs never force-logout active ones.
 *
 * If the JWT can't be decoded (malformed, missing `exp`), the timers are skipped
 * silently — the active-tab redirect on 401 still covers the symptom on the next
 * user-initiated request.
 */
const useIdleSessionLogout = ({
  token,
  onExpired,
  onSessionDead,
  getStoredToken,
  onResync,
  getLastActivityAt,
  renewSession,
  disabled = false,
}: UseIdleSessionLogoutOptions): void => {
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
          (onSessionDead ?? onExpired)();
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

    // Fallback decision just after expiry, for tabs that did not renew.
    const logoutDelay = Math.max(expiry - armedAt + SESSION_EXPIRY_BUFFER_MS, 0);
    const logoutTimeoutId = window.setTimeout(() => {
      if (tryResync()) {
        return;
      }
      if (wasActive() && renewSession) {
        renew();
        return;
      }
      // Genuinely idle: log out only this tab.
      onExpired();
    }, logoutDelay);

    return () => {
      window.clearTimeout(renewTimeoutId);
      window.clearTimeout(logoutTimeoutId);
    };
  }, [
    token,
    onExpired,
    onSessionDead,
    getStoredToken,
    onResync,
    getLastActivityAt,
    renewSession,
    disabled,
  ]);
};

export { useIdleSessionLogout, SESSION_EXPIRY_BUFFER_MS, SESSION_RENEW_MARGIN_MS };
export type { UseIdleSessionLogoutOptions };
