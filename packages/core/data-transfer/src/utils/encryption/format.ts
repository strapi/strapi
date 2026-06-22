export const ENCRYPTION_FORMAT_V2_MAGIC = Buffer.from('STRAPI2\0');

export const ENCRYPTION_FORMAT_V2_VERSION = 2;

export const ENCRYPTION_FORMAT_V2_SALT_LENGTH = 16;

/** Legacy exports derive keys with an empty scrypt salt for cross-instance compatibility. */
export const LEGACY_KDF_SALT = '';

export const ENCRYPTION_FORMAT_V2_HEADER_LENGTH =
  ENCRYPTION_FORMAT_V2_MAGIC.length + 1 + 1 + ENCRYPTION_FORMAT_V2_SALT_LENGTH;

export interface EncryptionFormatV2Header {
  version: number;
  salt: Buffer;
}

export const hasEncryptionFormatV2Magic = (buffer: Buffer): boolean => {
  if (buffer.length < ENCRYPTION_FORMAT_V2_MAGIC.length) {
    return false;
  }

  return buffer.subarray(0, ENCRYPTION_FORMAT_V2_MAGIC.length).equals(ENCRYPTION_FORMAT_V2_MAGIC);
};

export const buildEncryptionFormatV2Header = (salt: Buffer): Buffer => {
  const header = Buffer.alloc(ENCRYPTION_FORMAT_V2_HEADER_LENGTH);

  ENCRYPTION_FORMAT_V2_MAGIC.copy(header, 0);
  header.writeUInt8(ENCRYPTION_FORMAT_V2_VERSION, ENCRYPTION_FORMAT_V2_MAGIC.length);
  header.writeUInt8(salt.length, ENCRYPTION_FORMAT_V2_MAGIC.length + 1);
  salt.copy(header, ENCRYPTION_FORMAT_V2_MAGIC.length + 2);

  return header;
};

export const tryParseEncryptionFormatV2Header = (
  buffer: Buffer
): EncryptionFormatV2Header | null => {
  if (buffer.length < ENCRYPTION_FORMAT_V2_HEADER_LENGTH) {
    return null;
  }

  if (!hasEncryptionFormatV2Magic(buffer)) {
    return null;
  }

  const version = buffer.readUInt8(ENCRYPTION_FORMAT_V2_MAGIC.length);

  if (version !== ENCRYPTION_FORMAT_V2_VERSION) {
    return null;
  }

  const saltLength = buffer.readUInt8(ENCRYPTION_FORMAT_V2_MAGIC.length + 1);

  if (saltLength !== ENCRYPTION_FORMAT_V2_SALT_LENGTH) {
    return null;
  }

  const saltStart = ENCRYPTION_FORMAT_V2_MAGIC.length + 2;
  const salt = buffer.subarray(saltStart, saltStart + saltLength);

  return { version, salt };
};
