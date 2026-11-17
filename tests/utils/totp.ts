// RFC 4648 base32 and RFC 4226 dynamic truncation are bit-level algorithms.
/* eslint-disable no-bitwise */
import crypto from 'node:crypto';

/**
 * A test-side TOTP code generator for the two-factor API and e2e suites. The server's own
 * implementation is internal to `@strapi/admin`, and an independent one here is also a check on it:
 * a code the server accepts was produced without reusing its code.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Decodes the base32 secret the enrolment endpoint returns. */
export const base32Decode = (input: string): Buffer => {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of input.toUpperCase().replace(/[\s=]/g, '')) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
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

/** RFC 6238 TOTP with HMAC-SHA-1, the algorithm the admin server uses. */
export const generateTotp = ({
  secret,
  step = 30,
  digits = 6,
  timestamp = Math.floor(Date.now() / 1000),
}: {
  secret: Buffer;
  step?: number;
  digits?: number;
  timestamp?: number;
}): string => {
  const counter = Math.floor(timestamp / step);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter % 2 ** 32, 4);

  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];

  return String(binary % 10 ** digits).padStart(digits, '0');
};
