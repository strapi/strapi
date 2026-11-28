export type TwoFactorMethod = 'totp' | 'otp';

const TWO_FACTOR_METHODS: TwoFactorMethod[] = ['totp', 'otp'];

/** Auth plugin id used by Better Auth UI's two-factor integration. */
export const TWO_FACTOR_PLUGIN_ID = 'twoFactor';

/**
 * `sessionStorage` key holding the methods reported by the sign-in response.
 *
 * Only the non-sensitive method names are stored, never a code, token, or the
 * two-factor cookie, which stays HTTP-only.
 */
export const TWO_FACTOR_METHODS_STORAGE_KEY = 'better-auth-ui.two-factor-methods';

type TwoFactorRedirect = {
  twoFactorRedirect: true;
  twoFactorMethods?: unknown;
};

/** Detect the redirect payload Better Auth returns before a second factor. */
export function isTwoFactorRedirect(data: unknown): data is TwoFactorRedirect {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { twoFactorRedirect?: unknown }).twoFactorRedirect === true
  );
}

/** Narrow arbitrary method names to the challenge views this UI supports. */
export function parseTwoFactorMethods(methods?: unknown): TwoFactorMethod[] {
  if (!Array.isArray(methods)) return [];

  return TWO_FACTOR_METHODS.filter((method) => methods.includes(method));
}

/** Persist the enabled method names without blocking sign-in on storage errors. */
export function storeTwoFactorMethods(methods?: unknown) {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.setItem(
      TWO_FACTOR_METHODS_STORAGE_KEY,
      JSON.stringify(parseTwoFactorMethods(methods))
    );
  } catch {
    // The challenge falls back to every method when storage is unavailable.
  }
}

/** Read the stored methods, falling back to every supported challenge. */
export function readTwoFactorMethods(): TwoFactorMethod[] {
  if (typeof sessionStorage === 'undefined') return TWO_FACTOR_METHODS;

  try {
    const stored = sessionStorage.getItem(TWO_FACTOR_METHODS_STORAGE_KEY);
    if (!stored) return TWO_FACTOR_METHODS;

    const methods = parseTwoFactorMethods(JSON.parse(stored));
    return methods.length ? methods : TWO_FACTOR_METHODS;
  } catch {
    return TWO_FACTOR_METHODS;
  }
}

/** Clear stored method hints after the challenge finishes or is abandoned. */
export function clearTwoFactorMethods() {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.removeItem(TWO_FACTOR_METHODS_STORAGE_KEY);
  } catch {
    // Stale method hints are harmless and must not block navigation.
  }
}
