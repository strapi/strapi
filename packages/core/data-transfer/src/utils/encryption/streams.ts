import { randomBytes } from 'crypto';
import { Transform } from 'stream';

import type { Algorithm } from '../../types';
import { createDecryptionCipher } from './decrypt';
import { createEncryptionCipher } from './encrypt';
import {
  buildStrapiExEncryptionHeader,
  ENCRYPTION_HEADER_MAGIC,
  ENCRYPTION_HEADER_SALT_LENGTH,
  EncryptionHeaderParseError,
  hasStrapiExMagic,
  LEGACY_KDF_SALT,
  parseStrapiExEncryptionHeader,
  readStrapiExHeaderLength,
  type StrapiExEncryptionHeader,
} from './format';

export type EncryptionFormat = 'legacy' | 'strapiex';

export interface EncryptionStreamOptions {
  key: string;
  algorithm?: Algorithm;
  format?: EncryptionFormat;
}

export interface DecryptionStreamOptions {
  key: string;
  algorithm?: Algorithm;
}

const toCallbackError = (error: unknown): Error => {
  return error instanceof Error ? error : new Error(String(error));
};

const resolveLegacyDecryption = (
  key: string,
  algorithm: Algorithm,
  buffered: Buffer
): { decipher: ReturnType<typeof createDecryptionCipher>; pending: Buffer } => {
  const decipher = createDecryptionCipher(key, algorithm, LEGACY_KDF_SALT);
  const pending = buffered.length > 0 ? decipher.update(buffered) : Buffer.alloc(0);

  return { decipher, pending };
};

const resolveStrapiExDecryption = (
  key: string,
  algorithm: Algorithm,
  header: StrapiExEncryptionHeader,
  remainder: Buffer
): { decipher: ReturnType<typeof createDecryptionCipher>; pending: Buffer } => {
  const decipher = createDecryptionCipher(key, algorithm, header.salt);
  const pending = remainder.length > 0 ? decipher.update(remainder) : Buffer.alloc(0);

  return { decipher, pending };
};

export const createEncryptionStream = ({
  key,
  algorithm = 'aes-128-ecb',
  format = 'strapiex',
}: EncryptionStreamOptions): Transform => {
  if (format === 'legacy') {
    const cipher = createEncryptionCipher(key, algorithm, LEGACY_KDF_SALT);

    return cipher;
  }

  const salt = randomBytes(ENCRYPTION_HEADER_SALT_LENGTH);
  const header = buildStrapiExEncryptionHeader(salt);
  const cipher = createEncryptionCipher(key, algorithm, salt);
  let headerWritten = false;

  return new Transform({
    transform(chunk, _encoding, callback) {
      try {
        const encrypted = cipher.update(chunk);

        if (!headerWritten) {
          headerWritten = true;
          callback(null, Buffer.concat([header, encrypted]));
          return;
        }

        callback(null, encrypted);
      } catch (error) {
        callback(toCallbackError(error));
      }
    },
    flush(callback) {
      try {
        callback(null, cipher.final());
      } catch (error) {
        callback(toCallbackError(error));
      }
    },
  });
};

export const createDecryptionStream = ({
  key,
  algorithm = 'aes-128-ecb',
}: DecryptionStreamOptions): Transform => {
  let decipher: ReturnType<typeof createDecryptionCipher> | null = null;
  let headerBuffer = Buffer.alloc(0);
  let formatResolved = false;

  const finalizeDecryption = (callback: (error?: Error | null, data?: Buffer) => void) => {
    try {
      if (!decipher) {
        callback();
        return;
      }

      callback(null, decipher.final());
    } catch (error) {
      callback(toCallbackError(error));
    }
  };

  const resolveStrapiExHeader = (
    callback: (error?: Error | null, data?: Buffer) => void
  ): boolean => {
    const headerLength = readStrapiExHeaderLength(headerBuffer);

    if (headerLength === null || headerBuffer.length < headerLength) {
      return false;
    }

    formatResolved = true;

    try {
      const parsed = parseStrapiExEncryptionHeader(headerBuffer.subarray(0, headerLength));
      const remainder = headerBuffer.subarray(headerLength);
      const resolved = resolveStrapiExDecryption(key, algorithm, parsed, remainder);

      decipher = resolved.decipher;
      headerBuffer = Buffer.alloc(0);
      callback(null, resolved.pending);
    } catch (error) {
      callback(toCallbackError(error));
    }

    return true;
  };

  return new Transform({
    transform(chunk, _encoding, callback) {
      try {
        if (formatResolved) {
          callback(null, decipher!.update(chunk));
          return;
        }

        headerBuffer = Buffer.concat([headerBuffer, chunk]);

        if (headerBuffer.length >= ENCRYPTION_HEADER_MAGIC.length) {
          if (!hasStrapiExMagic(headerBuffer)) {
            formatResolved = true;
            const resolved = resolveLegacyDecryption(key, algorithm, headerBuffer);
            decipher = resolved.decipher;
            headerBuffer = Buffer.alloc(0);
            callback(null, resolved.pending);
            return;
          }

          if (resolveStrapiExHeader(callback)) {
            return;
          }
        }

        callback();
      } catch (error) {
        callback(toCallbackError(error));
      }
    },
    flush(callback) {
      try {
        if (!formatResolved) {
          if (headerBuffer.length === 0) {
            callback();
            return;
          }

          if (hasStrapiExMagic(headerBuffer)) {
            if (!resolveStrapiExHeader(callback)) {
              callback(new EncryptionHeaderParseError('Truncated STRAPIEX encryption header'));
            }

            return;
          }

          formatResolved = true;
          const resolved = resolveLegacyDecryption(key, algorithm, headerBuffer);
          decipher = resolved.decipher;
          headerBuffer = Buffer.alloc(0);
          callback(null, Buffer.concat([resolved.pending, decipher.final()]));
          return;
        }

        finalizeDecryption(callback);
      } catch (error) {
        callback(toCallbackError(error));
      }
    },
  });
};
