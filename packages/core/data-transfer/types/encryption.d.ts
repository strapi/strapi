import { Cipher, CipherKey, BinaryLike } from 'crypto';

export type EncryptionStrategy = (key: string) => Cipher;

export type Strategies = {
  'aes-128-ecb': (key: string) => Cipher;
  aes128: (key: string) => Cipher;
  aes192: (key: string) => Cipher;
  aes256: (key: string) => Cipher;
};

export type Algorithm = 'aes-128-ecb' | 'aes128' | 'aes192' | 'aes256';
