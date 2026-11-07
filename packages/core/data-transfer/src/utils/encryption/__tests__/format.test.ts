import { randomBytes } from 'crypto';

import {
  buildStrapiExEncryptionHeader,
  ENCRYPTION_HEADER_MAGIC,
  ENCRYPTION_HEADER_MIN_LENGTH,
  ENCRYPTION_HEADER_PREFIX_LENGTH,
  ENCRYPTION_HEADER_SALT_LENGTH,
  ENCRYPTION_HEADER_VERSION,
  ENCRYPTION_GCM_NONCE_LENGTH,
  ENCRYPTION_GCM_TAG_LENGTH,
  ENCRYPTION_TLV_CIPHER,
  ENCRYPTION_TLV_KDF,
  EncryptionHeaderParseError,
  hasStrapiExMagic,
  parseStrapiExEncryptionHeader,
  readStrapiExHeaderLength,
} from '../format';

describe('STRAPIEX encryption header', () => {
  test('builds and parses a header with a salt TLV', () => {
    const salt = randomBytes(ENCRYPTION_HEADER_SALT_LENGTH);
    const header = buildStrapiExEncryptionHeader(salt);

    expect(header).toHaveLength(ENCRYPTION_HEADER_MIN_LENGTH);
    expect(hasStrapiExMagic(header)).toBe(true);
    expect(readStrapiExHeaderLength(header)).toBe(ENCRYPTION_HEADER_MIN_LENGTH);

    const parsed = parseStrapiExEncryptionHeader(header);

    expect(parsed).toEqual({
      headerVersion: ENCRYPTION_HEADER_VERSION,
      salt,
      kdfId: 0,
      cipherId: 0,
    });
  });

  test('ignores unknown TLV types', () => {
    const salt = randomBytes(ENCRYPTION_HEADER_SALT_LENGTH);
    const header = buildStrapiExEncryptionHeader(salt);
    const unknownTlv = Buffer.from([0x99, 0x02, 0xaa, 0xbb]);
    const extended = Buffer.concat([header, unknownTlv]);

    extended.writeUInt16BE(header.length + unknownTlv.length, ENCRYPTION_HEADER_MAGIC.length + 1);

    expect(readStrapiExHeaderLength(extended)).toBe(header.length + unknownTlv.length);

    const parsed = parseStrapiExEncryptionHeader(extended);

    expect(parsed.salt).toEqual(salt);
  });

  test('builds and parses authenticated AES-256-GCM header metadata', () => {
    const salt = randomBytes(ENCRYPTION_HEADER_SALT_LENGTH);
    const nonce = randomBytes(ENCRYPTION_GCM_NONCE_LENGTH);
    const authTag = randomBytes(ENCRYPTION_GCM_TAG_LENGTH);
    const header = buildStrapiExEncryptionHeader(salt, { cipherId: 1, nonce, authTag });

    expect(parseStrapiExEncryptionHeader(header)).toEqual({
      headerVersion: ENCRYPTION_HEADER_VERSION,
      salt,
      kdfId: 0,
      cipherId: 1,
      nonce,
      authTag,
    });
  });

  test('uses header_length as the ciphertext offset for variable-size headers', () => {
    const salt = randomBytes(ENCRYPTION_HEADER_SALT_LENGTH);
    const header = buildStrapiExEncryptionHeader(salt);
    const unknownTlv = Buffer.from([0x99, 0x02, 0xaa, 0xbb]);
    const extended = Buffer.concat([header, unknownTlv]);

    extended.writeUInt16BE(header.length + unknownTlv.length, ENCRYPTION_HEADER_MAGIC.length + 1);

    const headerLength = readStrapiExHeaderLength(extended);
    const fakeCiphertext = Buffer.from('aes-ciphertext-bytes');
    const file = Buffer.concat([extended, fakeCiphertext]);

    expect(parseStrapiExEncryptionHeader(file.subarray(0, headerLength!)).salt).toEqual(salt);
    expect(file.subarray(headerLength!)).toEqual(fakeCiphertext);
  });

  test('throws when the buffer is too short', () => {
    expect(() => parseStrapiExEncryptionHeader(Buffer.alloc(4))).toThrow(
      EncryptionHeaderParseError
    );
  });

  test('throws when the magic does not match', () => {
    const header = Buffer.alloc(ENCRYPTION_HEADER_MIN_LENGTH, 0);

    expect(hasStrapiExMagic(header)).toBe(false);
    expect(() => parseStrapiExEncryptionHeader(header)).toThrow(EncryptionHeaderParseError);
  });

  test('throws when the header version is unsupported', () => {
    const salt = randomBytes(ENCRYPTION_HEADER_SALT_LENGTH);
    const header = buildStrapiExEncryptionHeader(salt);

    header.writeUInt8(99, ENCRYPTION_HEADER_MAGIC.length);

    expect(() => parseStrapiExEncryptionHeader(header)).toThrow(
      /Unsupported encryption header version/
    );
  });

  test('throws when the salt TLV is missing', () => {
    const header = Buffer.alloc(ENCRYPTION_HEADER_PREFIX_LENGTH, 0);

    ENCRYPTION_HEADER_MAGIC.copy(header, 0);
    header.writeUInt8(ENCRYPTION_HEADER_VERSION, ENCRYPTION_HEADER_MAGIC.length);
    header.writeUInt16BE(ENCRYPTION_HEADER_PREFIX_LENGTH, ENCRYPTION_HEADER_MAGIC.length + 1);

    expect(() => parseStrapiExEncryptionHeader(header)).toThrow(/Missing or invalid salt/);
  });

  test('throws when reserved flags are set', () => {
    const header = buildStrapiExEncryptionHeader(randomBytes(ENCRYPTION_HEADER_SALT_LENGTH));

    header.writeUInt8(1, ENCRYPTION_HEADER_MAGIC.length + 3);

    expect(() => parseStrapiExEncryptionHeader(header)).toThrow(
      /Unsupported encryption header flags/
    );
  });

  test.each([
    ['KDF', ENCRYPTION_TLV_KDF, /Unsupported KDF id/],
    ['cipher', ENCRYPTION_TLV_CIPHER, /Unsupported cipher id/],
  ])('throws when the %s id is unknown', (_name, type, error) => {
    const base = buildStrapiExEncryptionHeader(randomBytes(ENCRYPTION_HEADER_SALT_LENGTH));
    const header = Buffer.concat([base, Buffer.from([type, 1, 0x7f])]);

    header.writeUInt16BE(header.length, ENCRYPTION_HEADER_MAGIC.length + 1);

    expect(() => parseStrapiExEncryptionHeader(header)).toThrow(error);
  });

  test('throws when header_length is smaller than the fixed prefix', () => {
    const header = buildStrapiExEncryptionHeader(randomBytes(ENCRYPTION_HEADER_SALT_LENGTH));

    header.writeUInt16BE(ENCRYPTION_HEADER_PREFIX_LENGTH - 1, ENCRYPTION_HEADER_MAGIC.length + 1);

    expect(() => parseStrapiExEncryptionHeader(header)).toThrow(/Invalid encryption header length/);
  });

  test('throws when header_length exceeds the available bytes', () => {
    const header = buildStrapiExEncryptionHeader(randomBytes(ENCRYPTION_HEADER_SALT_LENGTH));

    header.writeUInt16BE(header.length + 1, ENCRYPTION_HEADER_MAGIC.length + 1);

    expect(() => parseStrapiExEncryptionHeader(header)).toThrow(/Invalid encryption header length/);
  });

  test('throws when a TLV value is truncated', () => {
    const base = buildStrapiExEncryptionHeader(randomBytes(ENCRYPTION_HEADER_SALT_LENGTH));
    const header = Buffer.concat([base, Buffer.from([0x7f, 10, 0x00])]);

    header.writeUInt16BE(header.length, ENCRYPTION_HEADER_MAGIC.length + 1);

    expect(() => parseStrapiExEncryptionHeader(header)).toThrow(/Truncated encryption header TLV/);
  });
});
