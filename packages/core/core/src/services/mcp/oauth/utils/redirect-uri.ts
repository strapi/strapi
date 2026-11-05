// eslint-disable-next-line no-script-url
const DANGEROUS_PROTOCOLS = new Set(['javascript:', 'data:', 'file:', 'vbscript:', 'blob:']);

const isLoopbackHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();

  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === '127.0.0.1' ||
    normalized === '[::1]' ||
    normalized === '::1'
  );
};

/**
 * Redirect URI rules for client registration (OAuth 2.1 §2.3 / RFC 8252):
 * - https URLs are allowed
 * - http URLs are allowed on loopback hosts only
 * - custom schemes (native apps) are allowed, except dangerous browser-executable schemes
 * - fragments are never allowed
 */
export const isAllowedRedirectUri = (uri: unknown): uri is string => {
  if (typeof uri !== 'string' || uri.length === 0 || uri.length > 2000) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }

  if (url.hash !== '' || uri.includes('#')) {
    return false;
  }

  const protocol = url.protocol.toLowerCase();

  if (DANGEROUS_PROTOCOLS.has(protocol)) {
    return false;
  }

  if (protocol === 'https:') {
    return true;
  }

  if (protocol === 'http:') {
    return isLoopbackHostname(url.hostname);
  }

  // Custom scheme for native apps.
  return true;
};

/**
 * OAuth 2.1 requires exact string comparison of redirect URIs.
 */
export const isRegisteredRedirectUri = (registeredUris: unknown, requested: unknown): boolean => {
  if (!Array.isArray(registeredUris) || typeof requested !== 'string') {
    return false;
  }

  return registeredUris.includes(requested);
};
