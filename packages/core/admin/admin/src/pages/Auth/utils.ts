const DEFAULT_REDIRECT_TO = '/';

/**
 * A redirect target is only safe if it resolves inside the admin app.
 *
 * Anything else must be rejected: react-router's browser history calls
 * `window.location.assign(href)` when `pushState` throws, and `pushState` throws a
 * `SecurityError` on a cross-origin href, so an off-app value becomes a real navigation
 * away from the admin origin.
 *
 * Requiring a single leading `/` is what does the work. It rejects protocol-relative
 * references (`//evil.com`), their backslash variant (`/\evil.com`, which browsers
 * normalise to `//`), and every scheme-bearing value (`https://evil.com`,
 * `javascript:alert(1)`), none of which start with a slash.
 */
const isSameAppPath = (value: string): boolean =>
  value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');

/**
 * Reads the `?redirectTo` the user was sent to the auth pages with, so that logging in from a
 * deep link returns them to where they started instead of the home page.
 *
 * Falls back to the home page when the param is absent, empty, or not a same-app path.
 */
export const getRedirectTo = (search: string): string => {
  // `URLSearchParams` already percent-decodes the value. Decoding it a second time would
  // corrupt targets holding encoded delimiters: `/foo?value=a%26b` would become
  // `/foo?value=a&b`, splitting one query value into two.
  const redirectTo = new URLSearchParams(search).get('redirectTo');

  if (!redirectTo || !isSameAppPath(redirectTo)) {
    return DEFAULT_REDIRECT_TO;
  }

  return redirectTo;
};

const SSO_REDIRECT_TO_STORAGE_KEY = 'strapi-sso-redirectTo';

/**
 * An SSO login leaves the app for the provider and returns on a different route, losing the
 * `?redirectTo` of the login page. The auth page persists it so the SSO callback can restore
 * it. Rendering the login page without a `redirectTo` starts a fresh flow, which clears the
 * stored value.
 */
export const persistSsoRedirectTo = (search: string): void => {
  try {
    const redirectTo = getRedirectTo(search);

    if (redirectTo !== DEFAULT_REDIRECT_TO) {
      sessionStorage.setItem(SSO_REDIRECT_TO_STORAGE_KEY, redirectTo);
    } else {
      sessionStorage.removeItem(SSO_REDIRECT_TO_STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable (private windows, blocked site data); the login still
    // works, it just lands on the home page.
  }
};

/**
 * Reads and clears the `redirectTo` persisted for the SSO round trip. The value is
 * re-validated by `getRedirectTo` when the login page consumes it.
 */
export const consumeSsoRedirectTo = (): string | null => {
  try {
    const redirectTo = sessionStorage.getItem(SSO_REDIRECT_TO_STORAGE_KEY);
    sessionStorage.removeItem(SSO_REDIRECT_TO_STORAGE_KEY);

    return redirectTo && isSameAppPath(redirectTo) ? redirectTo : null;
  } catch {
    return null;
  }
};
