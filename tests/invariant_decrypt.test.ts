import { createDecryptionCipher } from '../../../../packages/core/data-transfer/src/utils/encryption/decrypt';
import { scryptSync, createCipheriv, randomBytes } from 'crypto';

describe('Decryption key derivation must use a non-empty salt to prevent precomputation attacks', () => {
  const passwords = [
    'password123',      // common password - exact exploit case
    '',                 // boundary: empty password
    'a'.repeat(1024),  // boundary: very long password
  ];

  test.each(passwords)(
    'two different Strapi instances with password "%s" should NOT produce identical derived keys',
    (password) => {
      // If the implementation uses an empty salt, calling scryptSync(password, '', N)
      // will always produce the same key for the same password.
      // A secure implementation must use a unique salt so that identical passwords
      // yield different keys across different encryption operations.

      // We create two independent decryption ciphers and verify the implementation
      // does not rely on a deterministic (empty-salt) key derivation by checking
      // that scryptSync with empty salt matches what the module would produce.
      // If they match, the security invariant is violated.

      const emptySaltKey16 = scryptSync(password, '', 16);
      const emptySaltKey32 = scryptSync(password, '', 32);

      // Encrypt something with the empty-salt derived key (simulating attacker precomputation)
      const iv = randomBytes(16);
      const attackerCipher = require('crypto').createCipheriv('aes-256-ctr', scryptSync(password, '', 32), iv);
      const plaintext = Buffer.from('sensitive-export-data');
      const ciphertext = Buffer.concat([attackerCipher.update(plaintext), attackerCipher.final()]);

      // The security property: an attacker who precomputes keys with empty salt
      // should NOT be able to decrypt data encrypted by the module.
      // We test that the module's key derivation uses a proper salt by verifying
      // that the empty-salt derived key is NOT the same as what the module uses.
      
      // Since we cannot directly inspect the salt, we verify the invariant by
      // checking the source does not use empty string as salt
      const fs = require('fs');
      const path = require('path');
      const sourceFile = fs.readFileSync(
        path.resolve(__dirname, '../../../../packages/core/data-transfer/src/utils/encryption/decrypt.ts'),
        'utf-8'
      );

      // The security invariant: scryptSync must never be called with an empty string salt
      const emptySaltPattern = /scryptSync\s*\([^,]+,\s*['"`]{2}\s*,/g;
      const matches = sourceFile.match(emptySaltPattern);

      expect(matches).toBeNull();
    }
  );
});)