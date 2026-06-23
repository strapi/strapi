import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

import { createEncryptionCipher } from '../encrypt';
import {
  ENCRYPTION_HEADER_MAGIC,
  hasStrapiExMagic,
  LEGACY_KDF_SALT,
  readStrapiExHeaderLength,
  EncryptionHeaderParseError,
} from '../format';
import { createDecryptionStream, createEncryptionStream } from '../streams';

const collectStream = async (stream: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const roundTrip = async (
  plaintext: string,
  key: string,
  format: 'legacy' | 'strapiex' = 'strapiex'
): Promise<Buffer> => {
  const encrypted = await collectStream(
    Readable.from([plaintext]).pipe(createEncryptionStream({ key, format }))
  );

  return collectStream(Readable.from(encrypted).pipe(createDecryptionStream({ key })));
};

describe('encryption streams', () => {
  test('round-trips STRAPIEX exports with a per-file salt header', async () => {
    const plaintext = 'sensitive-export-data';
    const decrypted = await roundTrip(plaintext, 'export-password', 'strapiex');

    expect(decrypted.toString()).toBe(plaintext);
  });

  test('round-trips legacy exports without a header', async () => {
    const plaintext = 'legacy-export-data';
    const decrypted = await roundTrip(plaintext, 'export-password', 'legacy');

    expect(decrypted.toString()).toBe(plaintext);
  });

  test('decrypts legacy exports produced by the raw cipher API', async () => {
    const plaintext = 'legacy-cipher-export';
    const key = 'export-password';
    const cipher = createEncryptionCipher(key, 'aes-128-ecb', LEGACY_KDF_SALT);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const decrypted = await collectStream(
      Readable.from(encrypted).pipe(createDecryptionStream({ key }))
    );

    expect(decrypted.toString()).toBe(plaintext);
  });

  test('writes a STRAPIEX header and uses different ciphertext for the same password', async () => {
    const key = 'export-password';
    const plaintext = 'same-password-different-salt';

    const first = await collectStream(
      Readable.from([plaintext]).pipe(createEncryptionStream({ key, format: 'strapiex' }))
    );
    const second = await collectStream(
      Readable.from([plaintext]).pipe(createEncryptionStream({ key, format: 'strapiex' }))
    );

    expect(hasStrapiExMagic(first)).toBe(true);
    expect(hasStrapiExMagic(second)).toBe(true);

    const headerLength = readStrapiExHeaderLength(first);

    expect(headerLength).not.toBeNull();
    expect(first.subarray(0, headerLength!)).not.toEqual(second.subarray(0, headerLength!));
    expect(first.subarray(headerLength!)).not.toEqual(second.subarray(headerLength!));
  });

  test('decrypts STRAPIEX exports when the header arrives in small chunks', async () => {
    const plaintext = 'chunked-header-export';
    const key = 'export-password';
    const encrypted = await collectStream(
      Readable.from([plaintext]).pipe(createEncryptionStream({ key, format: 'strapiex' }))
    );

    const chunks = [encrypted.subarray(0, 5), encrypted.subarray(5, 12), encrypted.subarray(12)];

    const decrypted = await collectStream(
      Readable.from(chunks).pipe(createDecryptionStream({ key }))
    );

    expect(decrypted.toString()).toBe(plaintext);
  });

  test('decrypts legacy exports when ciphertext arrives in small chunks', async () => {
    const plaintext = 'chunked-legacy-export';
    const key = 'export-password';
    const encrypted = await collectStream(
      Readable.from([plaintext]).pipe(createEncryptionStream({ key, format: 'legacy' }))
    );

    const chunks = [encrypted.subarray(0, 3), encrypted.subarray(3, 10), encrypted.subarray(10)];

    const decrypted = await collectStream(
      Readable.from(chunks).pipe(createDecryptionStream({ key }))
    );

    expect(decrypted.toString()).toBe(plaintext);
  });

  test('decrypts exports with extended variable-length headers', async () => {
    const key = 'export-password';
    const plaintext = 'extended-header-export';
    const encrypted = await collectStream(
      Readable.from([plaintext]).pipe(createEncryptionStream({ key, format: 'strapiex' }))
    );

    const headerLength = readStrapiExHeaderLength(encrypted);

    expect(headerLength).not.toBeNull();

    const unknownTlv = Buffer.from([0x99, 0x00]);
    const extendedHeader = Buffer.concat([encrypted.subarray(0, headerLength!), unknownTlv]);

    extendedHeader.writeUInt16BE(
      headerLength! + unknownTlv.length,
      ENCRYPTION_HEADER_MAGIC.length + 1
    );

    const extended = Buffer.concat([extendedHeader, encrypted.subarray(headerLength!)]);

    const decrypted = await collectStream(
      Readable.from(extended).pipe(createDecryptionStream({ key }))
    );

    expect(decrypted.toString()).toBe(plaintext);
  });

  test('rejects truncated STRAPIEX headers instead of falling back to legacy', async () => {
    const key = 'export-password';
    const encrypted = await collectStream(
      Readable.from(['plaintext']).pipe(createEncryptionStream({ key, format: 'strapiex' }))
    );
    const truncated = encrypted.subarray(0, 20);

    await expect(
      collectStream(Readable.from(truncated).pipe(createDecryptionStream({ key })))
    ).rejects.toThrow(EncryptionHeaderParseError);
  });

  test('supports piping through pipeline', async () => {
    const plaintext = 'pipeline-export';
    const key = 'export-password';
    const encryptedChunks: Buffer[] = [];
    const encryptedStream = createEncryptionStream({ key, format: 'strapiex' });

    encryptedStream.on('data', (chunk) => {
      encryptedChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    await pipeline(Readable.from([plaintext]), encryptedStream);

    const encrypted = Buffer.concat(encryptedChunks);
    const decrypted = await collectStream(
      Readable.from(encrypted).pipe(createDecryptionStream({ key }))
    );

    expect(decrypted.toString()).toBe(plaintext);
  });
});
