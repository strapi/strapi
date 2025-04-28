import crypto from 'crypto';

const IV_LENGTH = 16; // 16 bytes for AES-GCM IV
/**
 * Encrypts a value string using AES-256-GCM.
 * Returns a string containing IV, encrypted content, and auth tag (all hex-encoded).
 */
const encrypt = (value: string) => {
  const encryptionKey: string = strapi.config.get('admin.secrets.encryptionKey');
  if (!encryptionKey) {
    strapi.log.warn('Encryption key is missing from config');
    return null;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);

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
  const encryptionKey: string = strapi.config.get('admin.secrets.encryptionKey');
  if (!encryptionKey) {
    strapi.log.warn('Encryption key is missing from config');
    return null;
  }
  const parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivHex, encryptedHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

export default {
  encrypt,
  decrypt,
};
