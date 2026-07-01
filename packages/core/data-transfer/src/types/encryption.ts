import type { createCipheriv, createDecipheriv } from 'crypto';

// @types/node 20.x names these classes Cipher/Decipher; 24.x renames it to Cipheriv/Decipheriv.
// Derive via ReturnType so signatures hold across both.
type Cipheriv = ReturnType<typeof createCipheriv>;
type Decipheriv = ReturnType<typeof createDecipheriv>;

export type EncryptionStrategy = (key: string) => Cipheriv | Decipheriv;

export type Strategies = {
  'aes-128-ecb': (key: string) => Cipheriv | Decipheriv;
  aes128: (key: string) => Cipheriv | Decipheriv;
  aes192: (key: string) => Cipheriv | Decipheriv;
  aes256: (key: string) => Cipheriv | Decipheriv;
};

export type Algorithm = 'aes-128-ecb' | 'aes128' | 'aes192' | 'aes256';
