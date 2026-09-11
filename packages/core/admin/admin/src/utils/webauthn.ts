import { browserSupportsWebAuthn } from '@simplewebauthn/browser';

/**
 * `dismissed` is not an error: the user closed the prompt, so every surface treats it as a silent
 * no-op. `already-registered` means `excludeCredentials` did its job. `unsupported` means the
 * browser refuses this origin or key type outright.
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
 * Duck-typed on purpose. `@simplewebauthn/browser` re-wraps most `DOMException`s as a
 * `WebAuthnError` with a `code` and the original in `cause`, but passes `NotAllowedError` through
 * untouched, so `name`, `cause.name` and `code` all have to be consulted. And the component tests
 * mock the module wholesale, so there is no class for `instanceof`.
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

export type PasskeyAvailability = 'available' | 'insecure-context' | 'unsupported';

/**
 * `browserSupportsWebAuthn()` only checks for `PublicKeyCredential`, which browsers do not expose
 * outside a secure context -- so a panel served over plain http fails it in an entirely capable
 * Chrome, and "this browser does not support passkeys" sends the operator to look in the wrong
 * place. `isSecureContext` separates the two, and is true for localhost.
 */
export const passkeyAvailability = (): PasskeyAvailability => {
  if (browserSupportsWebAuthn()) {
    return 'available';
  }
  return typeof window !== 'undefined' && window.isSecureContext === false
    ? 'insecure-context'
    : 'unsupported';
};
