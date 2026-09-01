// RFC 4648 base32 packing and RFC 4226 dynamic truncation are inherently bit-level algorithms.
/* eslint-disable no-bitwise */
import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DEFAULT_STEP = 30;
const DEFAULT_DIGITS = 6;
const SECRET_BYTES = 20;

export interface TotpWindow {
  back: number;
  forward: number;
}

export type VerifyTotpResult = { valid: false } | { valid: true; step: number };

/** 20 bytes from a CSPRNG, matching the HMAC-SHA-1 output length RFC 6238 recommends. */
export const generateTotpSecret = (): Buffer => crypto.randomBytes(SECRET_BYTES);

/** RFC 4648 base32, uppercase, unpadded. */
export const base32Encode = (buf: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

/** Tolerant of the spaces, lowercase and padding users paste out of an authenticator app. */
export const base32Decode = (input: string): Buffer => {
  const cleaned = input.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base32 character');
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

export const currentTotpStep = ({
  step = DEFAULT_STEP,
  timestamp = Math.floor(Date.now() / 1000),
}: { step?: number; timestamp?: number } = {}): number => Math.floor(timestamp / step);

const totpForStep = (secret: Buffer, counter: number, digits: number): string => {
  // 8-byte big-endian counter. Written in two 32-bit halves to stay safe above 2^32.
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter % 2 ** 32, 4);

  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();

  // Dynamic truncation, RFC 4226 section 5.4.
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];

  return String(binary % 10 ** digits).padStart(digits, '0');
};

export const generateTotp = ({
  secret,
  step = DEFAULT_STEP,
  digits = DEFAULT_DIGITS,
  timestamp = Math.floor(Date.now() / 1000),
}: {
  secret: Buffer;
  step?: number;
  digits?: number;
  timestamp?: number;
}): string => totpForStep(secret, Math.floor(timestamp / step), digits);

/** Length-safe constant time string comparison. */
export const constantTimeEquals = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so a length mismatch is not measurably faster.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Checks a submitted code against the accepted window and reports which step matched, so the
 * caller can persist it as a replay guard. Comparison is constant time per candidate.
 */
export const verifyTotp = ({
  secret,
  code,
  step = DEFAULT_STEP,
  digits = DEFAULT_DIGITS,
  window = { back: 1, forward: 0 },
  timestamp = Math.floor(Date.now() / 1000),
}: {
  secret: Buffer;
  code: string;
  step?: number;
  digits?: number;
  window?: TotpWindow;
  timestamp?: number;
}): VerifyTotpResult => {
  const submitted = (code ?? '').trim();
  if (submitted.length !== digits || !/^\d+$/.test(submitted)) {
    return { valid: false };
  }

  const current = Math.floor(timestamp / step);
  let matched: number | null = null;

  // Every candidate is always compared, so the number of comparisons does not depend on where
  // the match is. The loop deliberately does not break early.
  for (let offset = -window.back; offset <= window.forward; offset += 1) {
    const candidateStep = current + offset;
    const candidate = totpForStep(secret, candidateStep, digits);
    if (constantTimeEquals(candidate, submitted) && matched === null) {
      matched = candidateStep;
    }
  }

  return matched === null ? { valid: false } : { valid: true, step: matched };
};

export const buildOtpauthUri = ({
  secret,
  label,
  issuer,
  digits = DEFAULT_DIGITS,
  step = DEFAULT_STEP,
}: {
  secret: Buffer;
  label: string;
  issuer?: string;
  digits?: number;
  step?: number;
}): string => {
  // The label path segment is `Issuer:account`, encoded separately and joined with a raw
  // colon: authenticator apps expect the literal separator, not `%3A`.
  const labelPath = issuer
    ? `${encodeURIComponent(issuer)}:${encodeURIComponent(label)}`
    : encodeURIComponent(label);

  const params = [`secret=${base32Encode(secret)}`];
  if (issuer) {
    params.push(`issuer=${encodeURIComponent(issuer)}`);
  }
  params.push(`algorithm=SHA1`, `digits=${digits}`, `period=${step}`);

  return `otpauth://totp/${labelPath}?${params.join('&')}`;
};

// Crockford base32: no I, L, O or U, so transcription from paper is unambiguous.
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const RECOVERY_CODE_LENGTH = 10;

/** 10 characters over a 32 character alphabet, so 50 bits of entropy. */
export const generateRecoveryCode = (): string => {
  let code = '';
  // Rejection-free: 256 is not a multiple of 32, so mask to 5 bits instead of using modulo,
  // which would otherwise bias the first 8 characters of the alphabet.
  while (code.length < RECOVERY_CODE_LENGTH) {
    for (const byte of crypto.randomBytes(RECOVERY_CODE_LENGTH)) {
      if (code.length === RECOVERY_CODE_LENGTH) break;
      code += CROCKFORD_ALPHABET[byte & 31];
    }
  }
  return code;
};

export const generateRecoveryCodes = (count: number): string[] => {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateRecoveryCode());
  }
  return [...codes];
};

/** Accepts the dashes, spaces, lowercase and ambiguous characters a human will type. */
export const normaliseRecoveryCode = (input: string): string =>
  (input ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
    .replace(/U/g, 'V');
