import { createEncryptionCipher } from '..';

describe('Encryption', () => {
  test('encrypting data with default algorithm aes-128-ecb', () => {
    const cipher = createEncryptionCipher('password');
    const textToEncrypt = 'something ate an apple';
    const encryptedData = cipher.update(textToEncrypt);

    expect(cipher).toBeDefined();
    expect(encryptedData.toString()).not.toBe(textToEncrypt);
    expect(encryptedData).toBeInstanceOf(Buffer);
  });

  test('encrypting data with aes128', () => {
    const cipher = createEncryptionCipher('password', 'aes128');
    const textToEncrypt = 'something ate an apple';
    const encryptedData = cipher.update(textToEncrypt);

    expect(cipher).toBeDefined();
    expect(encryptedData.toString()).not.toBe(textToEncrypt);
    expect(encryptedData).toBeInstanceOf(Buffer);
  });

  test('encrypting data with aes192', () => {
    const cipher = createEncryptionCipher('password', 'aes192');
    const textToEncrypt = 'something ate an apple';
    const encryptedData = cipher.update(textToEncrypt);

    expect(cipher).toBeDefined();
    expect(encryptedData.toString()).not.toBe(textToEncrypt);
    expect(encryptedData).toBeInstanceOf(Buffer);
  });

  test('encrypting data with aes256', () => {
    const cipher = createEncryptionCipher('password', 'aes256');
    const textToEncrypt = 'something ate an apple';
    const encryptedData = cipher.update(textToEncrypt);

    expect(cipher).toBeDefined();
    expect(encryptedData.toString()).not.toBe(textToEncrypt);
    expect(encryptedData).toBeInstanceOf(Buffer);
  });

  test('data encrypted with different algorithms should have different results', () => {
    const cipherAES256 = createEncryptionCipher('password', 'aes256');
    const cipherAES192 = createEncryptionCipher('password', 'aes192');
    const cipherDefault = createEncryptionCipher('password');
    const textToEncrypt = 'something ate an apple';
    const encryptedDataAES256 = cipherAES256.update(textToEncrypt).toString();
    const encryptedDataAES192 = cipherAES192.update(textToEncrypt).toString();
    const encryptedDataDefault = cipherDefault.update(textToEncrypt).toString();

    expect(encryptedDataAES256).not.toBe(encryptedDataDefault);
    expect(encryptedDataAES256).not.toBe(encryptedDataAES192);
    expect(encryptedDataDefault).not.toBe(encryptedDataAES192);
  });

  test('data encrypted with different key should be different', () => {
    const cipher1 = createEncryptionCipher('password');
    const cipher2 = createEncryptionCipher('differentpassword');
    const textToEncrypt = 'something ate an apple';
    const encryptedData1 = cipher1.update(textToEncrypt).toString();
    const encryptedData2 = cipher2.update(textToEncrypt).toString();

    expect(encryptedData1).not.toBe(encryptedData2);
  });
});
