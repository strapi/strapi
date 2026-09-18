import { randomBytes } from 'crypto';

import {
  buildStrapiExEncryptionHeader,
  ENCRYPTION_HEADER_MAGIC,
  ENCRYPTION_HEADER_MIN_LENGTH,
  ENCRYPTION_HEADER_PREFIX_LENGTH,
  ENCRYPTION_HEADER_SALT_LENGTH,
  ENCRYPTION_HEADER_VERSION,
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
});
