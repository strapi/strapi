import crypto from 'crypto';
import encryption from '../encryption';

describe('Encryption Service', () => {
  const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

  beforeEach(() => {
    global.strapi = {
      config: {
        get: jest.fn((key) => {
          if (key === 'admin.secrets.encryptionKey') {
            return ENCRYPTION_KEY;
          }
          return undefined;
        }),
      },
      log: {
        warn: jest.fn(),
      },
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('encrypt', () => {
    test('encrypts and returns a four-part colon-separated string (version, iv, encrypted, auth)', () => {
      const encrypted = encryption.encrypt('super secret');

      expect(encrypted).toMatch(/^v1:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);

      const parts = encrypted!.split(':');
      expect(parts).toHaveLength(4);
    });

    test('returns null and logs warning when key is missing', () => {
      (global.strapi.config.get as jest.Mock).mockReturnValue(undefined);
      const result = encryption.encrypt('test');
      expect(result).toBeNull();
      expect(global.strapi.log.warn).toHaveBeenCalledWith('Encryption key is missing from config');
    });
  });

  describe('decrypt', () => {
    test('round-trips encrypted → decrypted', () => {
      const original = 'secret message';
      const encrypted = encryption.encrypt(original);
      const decrypted = encryption.decrypt(encrypted!);
      expect(decrypted).toBe(original);
    });

    test('throws for malformed input', () => {
      expect(() => encryption.decrypt('v1:bad-format')).toThrow('Invalid encrypted value format');
    });

    test('returns null and logs warning when key is missing', () => {
      (global.strapi.config.get as jest.Mock).mockReturnValue(undefined);
      const result = encryption.decrypt('v1:iv:payload:tag');
      expect(result).toBeNull();
      expect(global.strapi.log.warn).toHaveBeenCalledWith('Encryption key is missing from config');
    });

    test('returns null and logs warning when decryption fails due to wrong key', () => {
      const encrypted = encryption.encrypt('cannot decrypt this');

      const wrongKey = crypto.randomBytes(32).toString('hex');
      (global.strapi.config.get as jest.Mock).mockReturnValueOnce(wrongKey);

      const result = encryption.decrypt(encrypted!);

      expect(result).toBeNull();
      expect(global.strapi.log.warn).toHaveBeenCalledWith(
        '[decrypt] Unable to decrypt value — encryption key may have changed or data is corrupted.'
      );
    });
  });
});
