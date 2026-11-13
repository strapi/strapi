import { describe, test, expect } from 'vitest';
import { computeS256Challenge, isValidCodeChallenge, verifyS256Challenge } from '../pkce';

// RFC 7636 appendix B test vector
const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('pkce', () => {
  describe('computeS256Challenge', () => {
    test('matches the RFC 7636 test vector', () => {
      expect(computeS256Challenge(RFC_VERIFIER)).toBe(RFC_CHALLENGE);
    });
  });

  describe('isValidCodeChallenge', () => {
    test('accepts a 43-character base64url value', () => {
      expect(isValidCodeChallenge(RFC_CHALLENGE)).toBe(true);
    });

    test.each([
      [undefined],
      [null],
      [42],
      [''],
      ['too-short'],
      [`${RFC_CHALLENGE}extra`],
      ['E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw+cM'], // base64, not base64url
    ])('rejects %s', (value) => {
      expect(isValidCodeChallenge(value)).toBe(false);
    });
  });

  describe('verifyS256Challenge', () => {
    test('accepts the matching verifier', () => {
      expect(verifyS256Challenge(RFC_VERIFIER, RFC_CHALLENGE)).toBe(true);
    });

    test('rejects a wrong verifier', () => {
      expect(verifyS256Challenge('a'.repeat(43), RFC_CHALLENGE)).toBe(false);
    });

    test('rejects a verifier with an invalid charset or length', () => {
      expect(verifyS256Challenge('too-short', RFC_CHALLENGE)).toBe(false);
      expect(verifyS256Challenge('a'.repeat(129), RFC_CHALLENGE)).toBe(false);
      expect(verifyS256Challenge(`${'a'.repeat(42)}!`, RFC_CHALLENGE)).toBe(false);
      expect(verifyS256Challenge(undefined, RFC_CHALLENGE)).toBe(false);
    });
  });
});
