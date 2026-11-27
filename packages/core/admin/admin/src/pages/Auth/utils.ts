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
 * Builds the `?redirectTo` search string that sends the user back to `location` once they log in
 * again. Returns `undefined` for the home page, which is already the default, and for the auth
 * pages themselves, which would only bring the user back to the login form.
 */
export const getRedirectToSearch = ({
  pathname,
  search,
}: {
  pathname: string;
  search: string;
}): string | undefined => {
  if (pathname === '/' || pathname.startsWith('/auth/')) {
    return undefined;
  }

  return `?redirectTo=${encodeURIComponent(`${pathname}${search}`)}`;
};

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
