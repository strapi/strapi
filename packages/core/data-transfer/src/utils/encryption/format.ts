const STRAPIEX_ASCII = Buffer.from('STRAPIEX', 'ascii');

/** Eight-byte magic: `STRAPIEX` plus a null pad. */
export const ENCRYPTION_HEADER_MAGIC = Buffer.alloc(8);

STRAPIEX_ASCII.copy(ENCRYPTION_HEADER_MAGIC, 0);

export const ENCRYPTION_HEADER_VERSION = 1;

export const ENCRYPTION_HEADER_PREFIX_LENGTH = 12;

export const ENCRYPTION_HEADER_SALT_LENGTH = 16;

/** Legacy exports derive keys with an empty scrypt salt for cross-instance compatibility. */
export const LEGACY_KDF_SALT = '';

export const ENCRYPTION_TLV_SALT = 0x01;

export const ENCRYPTION_TLV_KDF = 0x02;

export const ENCRYPTION_TLV_CIPHER = 0x03;

export const ENCRYPTION_HEADER_MIN_LENGTH =
  ENCRYPTION_HEADER_PREFIX_LENGTH + 2 + ENCRYPTION_HEADER_SALT_LENGTH;

export interface StrapiExEncryptionHeader {
  headerVersion: number;
  salt: Buffer;
  kdfId: number;
  cipherId: number;
}

export class EncryptionHeaderParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionHeaderParseError';
  }
}

export const hasStrapiExMagic = (buffer: Buffer): boolean => {
  if (buffer.length < ENCRYPTION_HEADER_MAGIC.length) {
    return false;
  }

  return buffer.subarray(0, ENCRYPTION_HEADER_MAGIC.length).equals(ENCRYPTION_HEADER_MAGIC);
};

export const readStrapiExHeaderLength = (buffer: Buffer): number | null => {
  const lengthOffset = ENCRYPTION_HEADER_MAGIC.length + 1;

  if (buffer.length < lengthOffset + 2) {
    return null;
  }

  if (!hasStrapiExMagic(buffer)) {
    return null;
  }

  return buffer.readUInt16BE(lengthOffset);
};

const encodeTlv = (type: number, value: Buffer): Buffer => {
  const tlv = Buffer.alloc(2 + value.length);

  tlv.writeUInt8(type, 0);
  tlv.writeUInt8(value.length, 1);
  value.copy(tlv, 2);

  return tlv;
};

const parseTlvBody = (
  buffer: Buffer
): Pick<StrapiExEncryptionHeader, 'kdfId' | 'cipherId'> & { salt?: Buffer } => {
  const result = {
    kdfId: 0,
    cipherId: 0,
    salt: undefined as Buffer | undefined,
  };

  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 2 > buffer.length) {
      throw new EncryptionHeaderParseError('Truncated encryption header TLV');
    }

    const type = buffer.readUInt8(offset);
    const length = buffer.readUInt8(offset + 1);

    offset += 2;

    if (offset + length > buffer.length) {
      throw new EncryptionHeaderParseError('Truncated encryption header TLV value');
    }

    const value = buffer.subarray(offset, offset + length);

    offset += length;

    switch (type) {
      case ENCRYPTION_TLV_SALT:
        result.salt = value;
        break;
      case ENCRYPTION_TLV_KDF:
        if (length !== 1) {
          throw new EncryptionHeaderParseError('Invalid KDF TLV length');
        }

        result.kdfId = value.readUInt8(0);
        break;
      case ENCRYPTION_TLV_CIPHER:
        if (length !== 1) {
          throw new EncryptionHeaderParseError('Invalid cipher TLV length');
        }

        result.cipherId = value.readUInt8(0);
        break;
      default:
        break;
    }
  }

  return result;
};

export const buildStrapiExEncryptionHeader = (salt: Buffer): Buffer => {
  if (salt.length !== ENCRYPTION_HEADER_SALT_LENGTH) {
    throw new Error(`Salt must be ${ENCRYPTION_HEADER_SALT_LENGTH} bytes`);
  }

  const tlvBody = encodeTlv(ENCRYPTION_TLV_SALT, salt);
  const headerLength = ENCRYPTION_HEADER_PREFIX_LENGTH + tlvBody.length;
  const header = Buffer.alloc(headerLength);

  ENCRYPTION_HEADER_MAGIC.copy(header, 0);
  header.writeUInt8(ENCRYPTION_HEADER_VERSION, ENCRYPTION_HEADER_MAGIC.length);
  header.writeUInt16BE(headerLength, ENCRYPTION_HEADER_MAGIC.length + 1);
  header.writeUInt8(0, ENCRYPTION_HEADER_MAGIC.length + 3);
  tlvBody.copy(header, ENCRYPTION_HEADER_PREFIX_LENGTH);

  return header;
};

export const parseStrapiExEncryptionHeader = (buffer: Buffer): StrapiExEncryptionHeader => {
  if (buffer.length < ENCRYPTION_HEADER_PREFIX_LENGTH) {
    throw new EncryptionHeaderParseError('Encryption header is too short');
  }

  if (!hasStrapiExMagic(buffer)) {
    throw new EncryptionHeaderParseError('Invalid encryption header magic');
  }

  const headerVersion = buffer.readUInt8(ENCRYPTION_HEADER_MAGIC.length);

  if (headerVersion !== ENCRYPTION_HEADER_VERSION) {
    throw new EncryptionHeaderParseError(`Unsupported encryption header version: ${headerVersion}`);
  }

  const headerLength = buffer.readUInt16BE(ENCRYPTION_HEADER_MAGIC.length + 1);

  if (headerLength < ENCRYPTION_HEADER_PREFIX_LENGTH || buffer.length < headerLength) {
    throw new EncryptionHeaderParseError('Invalid encryption header length');
  }

  const flags = buffer.readUInt8(ENCRYPTION_HEADER_MAGIC.length + 3);

  if (flags !== 0) {
    throw new EncryptionHeaderParseError('Unsupported encryption header flags');
  }

  const tlvBody = buffer.subarray(ENCRYPTION_HEADER_PREFIX_LENGTH, headerLength);
  const parsed = parseTlvBody(tlvBody);

  if (!parsed.salt || parsed.salt.length !== ENCRYPTION_HEADER_SALT_LENGTH) {
    throw new EncryptionHeaderParseError('Missing or invalid salt in encryption header');
  }

  if (parsed.kdfId !== 0) {
    throw new EncryptionHeaderParseError(`Unsupported KDF id: ${parsed.kdfId}`);
  }

  if (parsed.cipherId !== 0) {
    throw new EncryptionHeaderParseError(`Unsupported cipher id: ${parsed.cipherId}`);
  }

  return {
    headerVersion,
    salt: parsed.salt,
    kdfId: parsed.kdfId,
    cipherId: parsed.cipherId,
  };
};
