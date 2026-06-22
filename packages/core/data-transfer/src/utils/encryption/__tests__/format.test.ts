import { randomBytes } from 'crypto';

import {
  buildEncryptionFormatV2Header,
  ENCRYPTION_FORMAT_V2_HEADER_LENGTH,
  ENCRYPTION_FORMAT_V2_MAGIC,
  ENCRYPTION_FORMAT_V2_SALT_LENGTH,
  ENCRYPTION_FORMAT_V2_VERSION,
  hasEncryptionFormatV2Magic,
  tryParseEncryptionFormatV2Header,
} from '../format';

describe('encryption format v2 header', () => {
  test('builds and parses a v2 header', () => {
    const salt = randomBytes(ENCRYPTION_FORMAT_V2_SALT_LENGTH);
    const header = buildEncryptionFormatV2Header(salt);

    expect(header).toHaveLength(ENCRYPTION_FORMAT_V2_HEADER_LENGTH);
    expect(hasEncryptionFormatV2Magic(header)).toBe(true);

    const parsed = tryParseEncryptionFormatV2Header(header);

    expect(parsed).toEqual({
      version: ENCRYPTION_FORMAT_V2_VERSION,
      salt,
    });
  });

  test('returns null when the buffer is too short', () => {
    expect(tryParseEncryptionFormatV2Header(Buffer.alloc(4))).toBeNull();
  });

  test('returns null when the magic does not match', () => {
    const header = Buffer.alloc(ENCRYPTION_FORMAT_V2_HEADER_LENGTH, 0);

    expect(hasEncryptionFormatV2Magic(header)).toBe(false);
    expect(tryParseEncryptionFormatV2Header(header)).toBeNull();
  });

  test('returns null when the version is unsupported', () => {
    const salt = randomBytes(ENCRYPTION_FORMAT_V2_SALT_LENGTH);
    const header = buildEncryptionFormatV2Header(salt);

    header.writeUInt8(99, ENCRYPTION_FORMAT_V2_MAGIC.length);

    expect(tryParseEncryptionFormatV2Header(header)).toBeNull();
  });
});
