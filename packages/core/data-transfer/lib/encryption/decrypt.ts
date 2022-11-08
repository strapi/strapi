import { Cipher, scryptSync, CipherKey, BinaryLike, createDecipheriv } from 'crypto';
import { EncryptionStrategy, Strategies, Algorithm } from '../../types';

// different key values depending on algorithm chosen
const getDecryptionStrategy = (algorithm: Algorithm): EncryptionStrategy => {
  const strategies: Strategies = {
    'aes-128-ecb': (key: string): Cipher => {
      const hashedKey = scryptSync(key, '', 16);
      const initVector: BinaryLike | null = null;
      const securityKey: CipherKey = hashedKey;
      return createDecipheriv(algorithm, securityKey, initVector);
    },
    aes128: (key: string): Cipher => {
      const hashedKey = scryptSync(key, '', 32);
      const initVector: BinaryLike | null = hashedKey.slice(16);
      const securityKey: CipherKey = hashedKey.slice(0, 16);
      return createDecipheriv(algorithm, securityKey, initVector);
    },
    aes192: (key: string): Cipher => {
      const hashedKey = scryptSync(key, '', 40);
      const initVector: BinaryLike | null = hashedKey.slice(24);
      const securityKey: CipherKey = hashedKey.slice(0, 24);
      return createDecipheriv(algorithm, securityKey, initVector);
    },
    aes256: (key: string): Cipher => {
      const hashedKey = scryptSync(key, '', 48);
      const initVector: BinaryLike | null = hashedKey.slice(32);
      const securityKey: CipherKey = hashedKey.slice(0, 32);
      return createDecipheriv(algorithm, securityKey, initVector);
    },
  };

  return strategies[algorithm];
};

export const createDecryptionCipher = (
  key: string,
  algorithm: Algorithm = 'aes-128-ecb'
): Cipher => {
  return getDecryptionStrategy(algorithm)(key);
};
