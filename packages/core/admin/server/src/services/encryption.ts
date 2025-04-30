import crypto from 'crypto';

const IV_LENGTH = 16; // 16 bytes for AES-GCM IV

const getHashedKey = (): Buffer | null => {
  const rawKey: string = strapi.config.get('admin.secrets.encryptionKey');
  if (!rawKey) {
    strapi.log.warn('Encryption key is missing from config');
    return null;
  }

  return crypto.createHash('sha256').update(rawKey).digest(); // Always 32 bytes
};

/**
 * Encrypts a value string using AES-256-GCM.
 * Returns a string containing IV, encrypted content, and auth tag (all hex-encoded).
 */
const encrypt = (value: string) => {
  const key = getHashedKey();
  if (!key) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
};

/**
 * Decrypts a value encrypted by encryptValue.
 * Input must be in the format: iv:encrypted:authTag (all hex-encoded).
 */
const decrypt = (encryptedValue: string) => {
  const key = getHashedKey();
  if (!key) return null;
  const parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivHex, encryptedHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    strapi.log.warn(
      '[decrypt] Unable to decrypt value — encryption key may have changed or data is corrupted.'
    );
    return null;
  }
};

export default {
  encrypt,
  decrypt,
};
