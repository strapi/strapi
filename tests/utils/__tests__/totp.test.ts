import { describe, expect, test } from 'vitest';

import { base32Decode, generateTotp } from '../totp';

describe('test-side TOTP', () => {
  // RFC 6238 Appendix B, SHA-1: the 6-digit code is the last six digits of the 8-digit value.
  test.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1234567890, '89005924'],
    [20000000000, '65353130'],
  ])('matches the RFC 6238 vector at %i', (timestamp, eight) => {
    const secret = Buffer.from('12345678901234567890', 'ascii');
    expect(generateTotp({ secret, timestamp, digits: 8 })).toBe(eight);
    expect(generateTotp({ secret, timestamp })).toBe(eight.slice(-6));
  });

  test('decodes base32 as pasted from an authenticator app', () => {
    expect(base32Decode('mzxw 6ytb oi').toString('ascii')).toBe('foobar');
  });
});
