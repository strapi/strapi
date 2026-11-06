import { createHmac } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const decodeBase32 = (input: string) => {
  const bits = [...input.replace(/=+$/, '')]
    .map((char) => ALPHABET.indexOf(char).toString(2).padStart(5, '0'))
    .join('');
  const bytes: number[] = [];

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
};

/**
 * The current time-based one-time code (RFC 6238: HMAC-SHA1, 30 seconds, 6 digits) for the secret
 * of an `otpauth://` URI, such as the one `/two-factor/enable` answers with.
 */
export const totpFromUri = (uri: string): string => {
  const secret = new URL(uri).searchParams.get('secret');

  if (!secret) {
    throw new Error(`No secret in ${uri}`);
  }

  const counter = Buffer.alloc(8);

  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));

  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;

  return String(code).padStart(6, '0');
};
