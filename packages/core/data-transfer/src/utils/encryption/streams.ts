import { randomBytes } from 'crypto';
import { Transform } from 'stream';

import type { Algorithm } from '../../types';
import { createDecryptionCipher } from './decrypt';
import { createEncryptionCipher } from './encrypt';
import {
  buildStrapiExEncryptionHeader,
  ENCRYPTION_GCM_NONCE_LENGTH,
  ENCRYPTION_HEADER_MAGIC,
  ENCRYPTION_HEADER_SALT_LENGTH,
  EncryptionHeaderParseError,
  hasStrapiExMagic,
  LEGACY_KDF_SALT,
  parseStrapiExEncryptionHeader,
  readStrapiExHeaderLength,
  type StrapiExEncryptionHeader,
} from './format';

type GcmCipher = ReturnType<typeof createEncryptionCipher> & { getAuthTag(): Buffer };
type GcmDecipher = ReturnType<typeof createDecryptionCipher> & {
  setAuthTag(tag: Buffer): GcmDecipher;
};

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
  header: StrapiExEncryptionHeader,
  remainder: Buffer
): {
  decipher: ReturnType<typeof createDecryptionCipher>;
  pending: Buffer;
  authenticated: boolean;
} => {
  const authenticated = header.cipherId === 1;
  const decipher = authenticated
    ? createDecryptionCipher(key, 'aes-256-gcm', header.salt, header.nonce)
    : createDecryptionCipher(key, 'aes-128-ecb', header.salt);

  if (authenticated) {
    (decipher as GcmDecipher).setAuthTag(header.authTag!);
  }

  const pending = remainder.length > 0 ? decipher.update(remainder) : Buffer.alloc(0);

  return { decipher, pending, authenticated };
};

export const createEncryptionStream = ({
  key,
  algorithm,
  format = 'strapiex',
}: EncryptionStreamOptions): Transform => {
  if (format === 'legacy') {
    const cipher = createEncryptionCipher(key, algorithm ?? 'aes-128-ecb', LEGACY_KDF_SALT);

    return cipher;
  }

  if (algorithm && algorithm !== 'aes-128-ecb' && algorithm !== 'aes-256-gcm') {
    throw new Error(`Unsupported STRAPIEX encryption algorithm: ${algorithm}`);
  }

  const salt = randomBytes(ENCRYPTION_HEADER_SALT_LENGTH);
  const cipherId = algorithm === 'aes-128-ecb' ? 0 : 1;
  const nonce = cipherId === 1 ? randomBytes(ENCRYPTION_GCM_NONCE_LENGTH) : undefined;
  const cipher = createEncryptionCipher(
    key,
    cipherId === 1 ? 'aes-256-gcm' : 'aes-128-ecb',
    salt,
    nonce
  );
  const ciphertext: Buffer[] = [];

  return new Transform({
    transform(chunk, _encoding, callback) {
      try {
        ciphertext.push(cipher.update(chunk));
        callback();
      } catch (error) {
        callback(toCallbackError(error));
      }
    },
    flush(callback) {
      try {
        ciphertext.push(cipher.final());
        const header = buildStrapiExEncryptionHeader(
          salt,
          cipherId === 1
            ? { cipherId, nonce, authTag: (cipher as GcmCipher).getAuthTag() }
            : { cipherId }
        );
        callback(null, Buffer.concat([header, ...ciphertext]));
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
  let authenticated = false;
  const decrypted: Buffer[] = [];

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
      const resolved = resolveStrapiExDecryption(key, parsed, remainder);

      decipher = resolved.decipher;
      authenticated = resolved.authenticated;
      headerBuffer = Buffer.alloc(0);
      if (authenticated) {
        decrypted.push(resolved.pending);
        callback();
      } else {
        callback(null, resolved.pending);
      }
    } catch (error) {
      callback(toCallbackError(error));
    }

    return true;
  };

  return new Transform({
    transform(chunk, _encoding, callback) {
      try {
        if (formatResolved) {
          const pending = decipher!.update(chunk);

          if (authenticated) {
            decrypted.push(pending);
            callback();
          } else {
            callback(null, pending);
          }

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
        if (authenticated) {
          decrypted.push(decipher!.final());
          callback(null, Buffer.concat(decrypted));
          return;
        }

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
