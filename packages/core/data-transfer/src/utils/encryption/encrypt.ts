import { createCipheriv, Cipheriv, scryptSync, CipherKey, BinaryLike } from 'crypto';
import { EncryptionStrategy, Strategies, Algorithm } from '../../../types';

// different key values depending on algorithm chosen
const getEncryptionStrategy = (algorithm: Algorithm): EncryptionStrategy => {
  const strategies: Strategies = {
    'aes-128-ecb'(key: string): Cipheriv {
      const hashedKey = scryptSync(key, '', 16);
      const initVector: BinaryLike | null = null;
      const securityKey: CipherKey = hashedKey;
      return createCipheriv(algorithm, securityKey, initVector);
    },
    aes128(key: string): Cipheriv {
      const hashedKey = scryptSync(key, '', 32);
      const initVector: BinaryLike | null = hashedKey.subarray(16);
      const securityKey: CipherKey = hashedKey.subarray(0, 16);
      return createCipheriv(algorithm, securityKey, initVector);
    },
    aes192(key: string): Cipheriv {
      const hashedKey = scryptSync(key, '', 40);
      const initVector: BinaryLike | null = hashedKey.subarray(24);
      const securityKey: CipherKey = hashedKey.subarray(0, 24);
      return createCipheriv(algorithm, securityKey, initVector);
    },
    aes256(key: string): Cipheriv {
      const hashedKey = scryptSync(key, '', 48);
      const initVector: BinaryLike | null = hashedKey.subarray(32);
      const securityKey: CipherKey = hashedKey.subarray(0, 32);
      return createCipheriv(algorithm, securityKey, initVector);
    },
  };

  return strategies[algorithm];
};

/**
 * It creates a cipher instance used for encryption
 *
 * @param key - The encryption key
 * @param algorithm - The algorithm to use to create the Cipher
 *
 * @returns A {@link Cipheriv} instance created with the given key & algorithm
 */
export const createEncryptionCipher = (
  key: string,
  algorithm: Algorithm = 'aes-128-ecb'
): Cipheriv => {
  return getEncryptionStrategy(algorithm)(key);
};
