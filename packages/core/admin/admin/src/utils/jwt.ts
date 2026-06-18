/**
 * Decode the `exp` claim of an admin access JWT and return it as milliseconds
 * since the epoch. Returns `null` if the token can't be parsed or has no
 * numeric `exp`.
 *
 * The signature is intentionally not verified — the server is the source of
 * truth for token validity. This is purely so the client can schedule a
 * one-shot timer to react to access-token expiry without polling.
 *
 * Handles `base64url` payloads (RFC 7515) by mapping the URL-safe alphabet
 * back to standard base64 and re-adding the `=` padding that `base64url`
 * strips. Some browsers' `atob` implementations reject unpadded input.
 */
const decodeAccessTokenExpiry = (token: string): number | null => {
  if (typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2 || parts[1].length === 0) {
    return null;
  }

  try {
    // base64url → base64
    const urlDecoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');

    // Restore `=` padding to a multiple of 4 chars; base64url omits it.
    const remainder = urlDecoded.length % 4;
    const padded = remainder === 0 ? urlDecoded : urlDecoded + '='.repeat(4 - remainder);

    const payload = JSON.parse(window.atob(padded));
    return typeof payload?.exp === 'number' && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null;
  } catch {
    return null;
  }
};

export { decodeAccessTokenExpiry };
