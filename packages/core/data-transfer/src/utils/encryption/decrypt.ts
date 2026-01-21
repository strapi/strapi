import { Decipheriv, scryptSync, CipherKey, BinaryLike, createDecipheriv } from 'crypto';
import { EncryptionStrategy, Strategies, Algorithm } from '../../../types';

// different key values depending on algorithm chosen
const getDecryptionStrategy = (algorithm: Algorithm): EncryptionStrategy => {
  const strategies: Strategies = {
    'aes-128-ecb'(key: string): Decipheriv {
      const hashedKey = scryptSync(key, '', 16);
      const initVector: BinaryLike | null = null;
      const securityKey: CipherKey = hashedKey;
      return createDecipheriv(algorithm, securityKey, initVector);
    },
    aes128(key: string): Decipheriv {
      const hashedKey = scryptSync(key, '', 32);
      const initVector: BinaryLike | null = hashedKey.subarray(16);
      const securityKey: CipherKey = hashedKey.subarray(0, 16);
      return createDecipheriv(algorithm, securityKey, initVector);
    },
    aes192(key: string): Decipheriv {
      const hashedKey = scryptSync(key, '', 40);
      const initVector: BinaryLike | null = hashedKey.subarray(24);
      const securityKey: CipherKey = hashedKey.subarray(0, 24);
      return createDecipheriv(algorithm, securityKey, initVector);
    },
    aes256(key: string): Decipheriv {
      const hashedKey = scryptSync(key, '', 48);
      const initVector: BinaryLike | null = hashedKey.subarray(32);
      const securityKey: CipherKey = hashedKey.subarray(0, 32);
      return createDecipheriv(algorithm, securityKey, initVector);
    },
  };

  return strategies[algorithm];
};

/**
 * It creates a cipher instance used for decryption
 *
 * @param key - The decryption key
 * @param algorithm - The algorithm to use to create the Cipher
 *
 * @returns A {@link Decipheriv} instance created with the given key & algorithm
 */
export const createDecryptionCipher = (
  key: string,
  algorithm: Algorithm = 'aes-128-ecb'
): Decipheriv => {
  return getDecryptionStrategy(algorithm)(key);
};
