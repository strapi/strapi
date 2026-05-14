import type { Cipheriv, Decipheriv } from 'crypto';

export type EncryptionStrategy = (key: string) => Cipheriv | Decipheriv;

export type Strategies = {
  'aes-128-ecb': (key: string) => Cipheriv | Decipheriv;
  aes128: (key: string) => Cipheriv | Decipheriv;
  aes192: (key: string) => Cipheriv | Decipheriv;
  aes256: (key: string) => Cipheriv | Decipheriv;
};

export type Algorithm = 'aes-128-ecb' | 'aes128' | 'aes192' | 'aes256';
