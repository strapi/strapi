import { createCipher } from '../encrypt';

describe('Encryption', () => {
  test('encrypting data with default algorithm aes-128-ecb', () => {
    const cipher = createCipher('password');
    const textToEncrypt = 'something ate an apple';
    const encryptedData = cipher.update(textToEncrypt);

    expect(cipher).toBeDefined();
    expect(encryptedData).not.toBe(textToEncrypt);
    expect(encryptedData).toBeInstanceOf(Buffer);
  });

  test('encrypting data with aes128', () => {
    const cipher = createCipher('password', 'aes128');
    const textToEncrypt = 'something ate an apple';
    const encryptedData = cipher.update(textToEncrypt);

    expect(cipher).toBeDefined();
    expect(encryptedData).not.toBe(textToEncrypt);
    expect(encryptedData).toBeInstanceOf(Buffer);
  });

  test('encrypting data with aes192', () => {
    const cipher = createCipher('password', 'aes192');
    const textToEncrypt = 'something ate an apple';
    const encryptedData = cipher.update(textToEncrypt);

    expect(cipher).toBeDefined();
    expect(encryptedData).not.toBe(textToEncrypt);
    expect(encryptedData).toBeInstanceOf(Buffer);
  });

  test('encrypting data with aes256', () => {
    const cipher = createCipher('password', 'aes256');
    const textToEncrypt = 'something ate an apple';
    const encryptedData = cipher.update(textToEncrypt);

    expect(cipher).toBeDefined();
    expect(encryptedData).not.toBe(textToEncrypt);
    expect(encryptedData).toBeInstanceOf(Buffer);
  });
});
