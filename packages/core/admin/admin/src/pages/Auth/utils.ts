const DEFAULT_REDIRECT_TO = '/';

/**
 * Reads the `?redirectTo` the user was sent to the auth pages with, so that logging in from a
 * deep link returns them to where they started instead of the home page.
 *
 * Falls back to the home page when the param is absent, empty, or not decodable. The value is
 * only ever handed to react-router's `navigate`, which resolves it as an in-app path, so an
 * absolute URL cannot be used to redirect off-site.
 */
export const getRedirectTo = (search: string): string => {
  const redirectTo = new URLSearchParams(search).get('redirectTo');

  if (!redirectTo) {
    return DEFAULT_REDIRECT_TO;
  }

  try {
    return decodeURIComponent(redirectTo) || DEFAULT_REDIRECT_TO;
  } catch {
    // `decodeURIComponent` throws on malformed percent-encoding (e.g. `?redirectTo=%E0%A4%A`)
    return DEFAULT_REDIRECT_TO;
  }
};
