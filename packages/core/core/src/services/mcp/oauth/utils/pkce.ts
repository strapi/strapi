import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * RFC 7636 §4.1: code_verifier is 43-128 characters of [A-Za-z0-9-._~].
 */
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;

/**
 * RFC 7636 §4.2: S256 code_challenge is the base64url (unpadded) SHA-256 of the verifier,
 * which is always 43 characters.
 */
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9\-_]{43}$/;

export const isValidCodeChallenge = (codeChallenge: unknown): codeChallenge is string =>
  typeof codeChallenge === 'string' && CODE_CHALLENGE_PATTERN.test(codeChallenge);

export const computeS256Challenge = (codeVerifier: string): string =>
  createHash('sha256').update(codeVerifier).digest('base64url');

export const verifyS256Challenge = (codeVerifier: unknown, codeChallenge: string): boolean => {
  if (typeof codeVerifier !== 'string' || !CODE_VERIFIER_PATTERN.test(codeVerifier)) {
    return false;
  }

  const computed = Buffer.from(computeS256Challenge(codeVerifier));
  const expected = Buffer.from(codeChallenge);

  return computed.length === expected.length && timingSafeEqual(computed, expected);
};
