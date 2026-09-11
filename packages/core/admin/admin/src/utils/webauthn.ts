import { browserSupportsWebAuthn } from '@simplewebauthn/browser';

/**
 * How a WebAuthn ceremony failed, as far as the UI is concerned.
 *
 * - `dismissed`: the user closed the prompt or it timed out. Not an error at all -- passkeys's
 *   rule is a silent no-op with the control re-enabled, because the user is still looking at the
 *   screen and knows what they just did.
 * - `already-registered`: registration only. `excludeCredentials` did its job and this
 *   authenticator already holds a credential for this account, which is worth saying out loud.
 * - `unsupported`: the browser refuses to run a ceremony for this origin or key type at all
 *   (a bad relying-party id, an insecure origin, no supported algorithm).
 * - `failed`: anything else.
 */
export type CeremonyErrorKind = 'dismissed' | 'already-registered' | 'unsupported' | 'failed';

const nameOf = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { name } = value as { name?: unknown };
  return typeof name === 'string' ? name : undefined;
};

const causeOf = (value: unknown): unknown =>
  typeof value === 'object' && value !== null ? (value as { cause?: unknown }).cause : undefined;

const codeOf = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { code } = value as { code?: unknown };
  return typeof code === 'string' ? code : undefined;
};

/**
 * Classifies whatever `startRegistration` / `startAuthentication` threw.
 *
 * Duck-typed on purpose, for two reasons. First, `@simplewebauthn/browser` handles the two shapes
 * differently: most `DOMException`s come back re-wrapped as a `WebAuthnError` carrying a `code`
 * and the original error in `cause`, but `NotAllowedError` is deliberately passed through
 * untouched (platforms overload that name with their own messages, which the library does not
 * want to overwrite) -- so both `name` and `cause.name` and `code` have to be consulted. Second,
 * every component test here mocks `@simplewebauthn/browser` wholesale, which exports no
 * `WebAuthnError` class for an `instanceof` check to use.
 *
 * Classifying in one place rather than at each entry point means one implementation and one test.
 */
export const ceremonyErrorKind = (error: unknown): CeremonyErrorKind => {
  const names = [nameOf(error), nameOf(causeOf(error))];
  const code = codeOf(error);

  if (
    names.includes('NotAllowedError') ||
    names.includes('AbortError') ||
    code === 'ERROR_CEREMONY_ABORTED'
  ) {
    return 'dismissed';
  }

  if (names.includes('InvalidStateError') || code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
    return 'already-registered';
  }

  if (
    names.includes('SecurityError') ||
    names.includes('NotSupportedError') ||
    code === 'ERROR_INVALID_DOMAIN' ||
    code === 'ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEY_ALGORITHMS'
  ) {
    return 'unsupported';
  }

  return 'failed';
};

/** Why a passkey ceremony cannot be offered here, when it cannot. */
export type PasskeyAvailability = 'available' | 'insecure-context' | 'unsupported';

/**
 * `browserSupportsWebAuthn()` is only `globalThis.PublicKeyCredential !== undefined`, and browsers
 * do not expose `PublicKeyCredential` at all outside a secure context. A self-hosted admin panel
 * served over plain http therefore fails that check in an entirely capable Chrome, and telling
 * that operator "this browser does not support passkeys" sends them to look in the wrong place --
 * there is nothing wrong with their browser and no version of it will fix this.
 *
 * `isSecureContext` separates the two. It is true for https and for localhost (which browsers
 * treat as secure precisely so development works unconfigured), so this only reports the insecure
 * case for the deployment that actually has one.
 */
export const passkeyAvailability = (): PasskeyAvailability => {
  if (browserSupportsWebAuthn()) {
    return 'available';
  }
  return typeof window !== 'undefined' && window.isSecureContext === false
    ? 'insecure-context'
    : 'unsupported';
};
