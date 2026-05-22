import { decodeAccessTokenExpiry } from '../jwt';

/**
 * Build a JWT-shaped string `<header>.<payload>.<signature>` where the
 * payload is base64url-encoded JSON. The signature is irrelevant — we never
 * verify it. The encoding intentionally mirrors RFC 7515 base64url:
 *   - `+` / `/` mapped to `-` / `_`
 *   - trailing `=` padding stripped
 *
 * That last point is the case we particularly want to cover, since unpadded
 * input is rejected by stricter `atob` implementations.
 */
const buildJwt = (payload: Record<string, unknown>): string => {
  const json = JSON.stringify(payload);
  const base64 = window.btoa(json);
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64url}.signature`;
};

describe('decodeAccessTokenExpiry', () => {
  it('returns exp in milliseconds for a well-formed token', () => {
    const expSeconds = 1_700_000_000;
    const token = buildJwt({ exp: expSeconds, sub: 'user-1' });

    expect(decodeAccessTokenExpiry(token)).toBe(expSeconds * 1000);
  });

  it('handles base64url payloads that require `=` padding', () => {
    /**
     * The padding requirement depends on the byte length of the JSON payload
     * mod 3. We try a range of payload sizes so at least one of them lands on
     * an encoded length that is not a multiple of 4 (i.e. would have been
     * padded with `=` in standard base64). If padding is not re-added before
     * `atob`, this test catches it.
     */
    for (let i = 0; i < 6; i += 1) {
      const padding = 'x'.repeat(i);
      const token = buildJwt({ exp: 1234567890, pad: padding });

      expect(decodeAccessTokenExpiry(token)).toBe(1234567890 * 1000);
    }
  });

  it('handles base64url payloads using URL-safe `-` and `_` characters', () => {
    /**
     * Forces `+` / `/` into the standard base64 output so the URL-safe
     * mapping in the decoder (`-` ↔ `+`, `_` ↔ `/`) is exercised. The exact
     * padding string is one we know produces those characters once base64'd.
     */
    const token = buildJwt({ exp: 9_999_999_999, marker: 'a?b>c<d' });

    expect(decodeAccessTokenExpiry(token)).toBe(9_999_999_999 * 1000);
  });

  it('returns null when the token is empty', () => {
    expect(decodeAccessTokenExpiry('')).toBeNull();
  });

  it('returns null when the token has no `.` separator', () => {
    expect(decodeAccessTokenExpiry('not-a-jwt')).toBeNull();
  });

  it('returns null when the payload segment is empty', () => {
    expect(decodeAccessTokenExpiry('header..signature')).toBeNull();
  });

  it('returns null when the payload is not valid JSON', () => {
    const garbage = window.btoa('{not json');
    expect(decodeAccessTokenExpiry(`header.${garbage}.signature`)).toBeNull();
  });

  it('returns null when the payload has no exp claim', () => {
    const token = buildJwt({ sub: 'user-1' });
    expect(decodeAccessTokenExpiry(token)).toBeNull();
  });

  it('returns null when exp is not a number', () => {
    const token = buildJwt({ exp: '1700000000' });
    expect(decodeAccessTokenExpiry(token)).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(decodeAccessTokenExpiry(undefined as unknown as string)).toBeNull();
    expect(decodeAccessTokenExpiry(null as unknown as string)).toBeNull();
    expect(decodeAccessTokenExpiry(12345 as unknown as string)).toBeNull();
  });
});
