import * as React from 'react';

import { decodeAccessTokenExpiry } from '../utils/jwt';

const SESSION_EXPIRY_BUFFER_MS = 1000;

interface UseIdleSessionLogoutOptions {
  /**
   * The current admin access JWT (from Redux), or `null` when logged out.
   */
  token: string | null;
  /**
   * Called when the timer fires. Typically clears local auth state and
   * navigates to /auth/login.
   */
  onExpired: () => void;
  /**
   * Escape hatch for tests / dev environments where we don't want the
   * automatic logout behavior. Mirrors the existing `_disableRenewToken`
   * prop on `<AuthProvider>`.
   */
  disabled?: boolean;
}

/**
 * Schedule a one-shot logout when the access token's `exp` elapses.
 *
 * The hook re-runs whenever `token` changes. While the user is active, every
 * API call that hits a 401 transparently refreshes the access token (see
 * `withTokenRefresh` in `getFetchClient.ts`), which dispatches `setToken` and
 * causes this effect to re-arm with the new, later `exp`.
 *
 * If the JWT can't be decoded (malformed, missing `exp`), the timer is
 * skipped silently — the active-tab redirect on 401 still covers the
 * symptom on the next user-initiated request.
 */
const useIdleSessionLogout = ({
  token,
  onExpired,
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

    const msUntilExpiry = expiry - Date.now() + SESSION_EXPIRY_BUFFER_MS;

    const timeoutId = window.setTimeout(
      () => {
        onExpired();
      },
      Math.max(msUntilExpiry, 0)
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [token, onExpired, disabled]);
};

export { useIdleSessionLogout, SESSION_EXPIRY_BUFFER_MS };
export type { UseIdleSessionLogoutOptions };
