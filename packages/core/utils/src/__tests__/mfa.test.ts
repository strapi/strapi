import {
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  currentTotpStep,
  generateTotp,
  generateTotpSecret,
  verifyTotp,
  generateRecoveryCode,
  generateRecoveryCodes,
  normaliseRecoveryCode,
} from '../mfa';

// RFC 6238 Appendix B, SHA-1 rows. The seed is the ASCII string below, 20 bytes.
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');

// The RFC prints 8-digit values; the 6-digit code is its last 6 digits.
const RFC_VECTORS: Array<{ timestamp: number; eight: string }> = [
  { timestamp: 59, eight: '94287082' },
  { timestamp: 1111111109, eight: '07081804' },
  { timestamp: 1111111111, eight: '14050471' },
  { timestamp: 1234567890, eight: '89005924' },
  { timestamp: 2000000000, eight: '69279037' },
  { timestamp: 20000000000, eight: '65353130' },
];

describe('generateTotp', () => {
  test.each(RFC_VECTORS)(
    'matches RFC 6238 at T=$timestamp for 8 digits',
    ({ timestamp, eight }) => {
      expect(generateTotp({ secret: RFC_SECRET, timestamp, digits: 8, step: 30 })).toBe(eight);
    }
  );

  test.each(RFC_VECTORS)(
    'matches RFC 6238 at T=$timestamp for 6 digits',
    ({ timestamp, eight }) => {
      expect(generateTotp({ secret: RFC_SECRET, timestamp, digits: 6, step: 30 })).toBe(
        eight.slice(-6)
      );
    }
  );

  test('pads short values to the requested digit count', () => {
    const code = generateTotp({ secret: RFC_SECRET, timestamp: 1234567890, digits: 6, step: 30 });
    expect(code).toBe('005924');
    expect(code).toHaveLength(6);
  });
});

describe('base32', () => {
  test('round-trips a random secret', () => {
    const secret = generateTotpSecret();
    expect(base32Decode(base32Encode(secret)).equals(secret)).toBe(true);
  });

  test('encodes with RFC 4648 alphabet, uppercase and unpadded', () => {
    expect(base32Encode(Buffer.from('foobar', 'ascii'))).toBe('MZXW6YTBOI');
  });

  test('decoding ignores spaces and lowercase, as users paste them', () => {
    const secret = Buffer.from('foobar', 'ascii');
    expect(base32Decode('mzxw 6ytb oi').equals(secret)).toBe(true);
  });
});

describe('generateTotpSecret', () => {
  test('is 20 bytes', () => {
    expect(generateTotpSecret()).toHaveLength(20);
  });

  test('does not repeat', () => {
    expect(generateTotpSecret().equals(generateTotpSecret())).toBe(false);
  });
});

describe('currentTotpStep', () => {
  test('floors the timestamp to the current step index', () => {
    expect(currentTotpStep({ timestamp: 1234567905, step: 30 })).toBe(41152263);
  });

  test('defaults to a 30 second step', () => {
    expect(currentTotpStep({ timestamp: 1234567905 })).toBe(41152263);
  });
});

describe('verifyTotp', () => {
  const step = 30;
  const timestamp = 1234567890;
  const at = (t: number) => generateTotp({ secret: RFC_SECRET, timestamp: t, digits: 6, step });

  test('accepts the current step and reports which step matched', () => {
    const result = verifyTotp({ secret: RFC_SECRET, code: at(timestamp), timestamp, step });
    expect(result).toEqual({ valid: true, step: Math.floor(timestamp / step) });
  });

  test('accepts the previous step by default', () => {
    const result = verifyTotp({ secret: RFC_SECRET, code: at(timestamp - step), timestamp, step });
    expect(result).toEqual({ valid: true, step: Math.floor((timestamp - step) / step) });
  });

  test('rejects the next step by default', () => {
    expect(verifyTotp({ secret: RFC_SECRET, code: at(timestamp + step), timestamp, step })).toEqual(
      { valid: false }
    );
  });

  test('rejects two steps back by default', () => {
    expect(
      verifyTotp({ secret: RFC_SECRET, code: at(timestamp - 2 * step), timestamp, step })
    ).toEqual({ valid: false });
  });

  test('accepts the next step when the window is widened', () => {
    const result = verifyTotp({
      secret: RFC_SECRET,
      code: at(timestamp + step),
      timestamp,
      step,
      window: { back: 1, forward: 1 },
    });
    expect(result).toEqual({ valid: true, step: Math.floor((timestamp + step) / step) });
  });

  test('rejects a malformed code without throwing', () => {
    expect(verifyTotp({ secret: RFC_SECRET, code: 'abc', timestamp, step })).toEqual({
      valid: false,
    });
    expect(verifyTotp({ secret: RFC_SECRET, code: '', timestamp, step })).toEqual({ valid: false });
  });
});

describe('buildOtpauthUri', () => {
  test('produces a scannable uri with the issuer in both places', () => {
    const uri = buildOtpauthUri({
      secret: Buffer.from('foobar', 'ascii'),
      label: 'kai@doe.com',
      issuer: 'My Project',
    });
    expect(uri).toBe(
      'otpauth://totp/My%20Project:kai%40doe.com?secret=MZXW6YTBOI&issuer=My%20Project&algorithm=SHA1&digits=6&period=30'
    );
  });

  test('omits the issuer prefix when no issuer is given', () => {
    const uri = buildOtpauthUri({ secret: Buffer.from('foobar', 'ascii'), label: 'kai@doe.com' });
    expect(uri).toBe(
      'otpauth://totp/kai%40doe.com?secret=MZXW6YTBOI&algorithm=SHA1&digits=6&period=30'
    );
  });
});

describe('recovery codes', () => {
  test('is 10 characters from the Crockford alphabet', () => {
    // Crockford base32 excludes I, L, O and U so a human transcribing from paper cannot
    // confuse them with 1, 1, 0 and V.
    expect(generateRecoveryCode()).toMatch(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/);
  });

  test('generates the requested number of distinct codes', () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  test('normalises the formatting a user is likely to type', () => {
    const code = generateRecoveryCode();
    const messy = `  ${code.slice(0, 5).toLowerCase()}-${code.slice(5).toLowerCase()} `;
    expect(normaliseRecoveryCode(messy)).toBe(code);
  });

  test('maps the ambiguous characters a user might type by mistake', () => {
    expect(normaliseRecoveryCode('OIL')).toBe('011');
    expect(normaliseRecoveryCode('u')).toBe('V');
  });
});
