import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

import { createEncryptionCipher } from '../encrypt';
import { hasEncryptionFormatV2Magic, LEGACY_KDF_SALT } from '../format';
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
  format: 'legacy' | 'v2' = 'v2'
): Promise<Buffer> => {
  const encrypted = await collectStream(
    Readable.from([plaintext]).pipe(createEncryptionStream({ key, format }))
  );

  return collectStream(Readable.from(encrypted).pipe(createDecryptionStream({ key })));
};

describe('encryption streams', () => {
  test('round-trips v2 exports with a per-file salt header', async () => {
    const plaintext = 'sensitive-export-data';
    const decrypted = await roundTrip(plaintext, 'export-password', 'v2');

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

  test('writes a v2 header and uses different ciphertext for the same password', async () => {
    const key = 'export-password';
    const plaintext = 'same-password-different-salt';

    const first = await collectStream(
      Readable.from([plaintext]).pipe(createEncryptionStream({ key, format: 'v2' }))
    );
    const second = await collectStream(
      Readable.from([plaintext]).pipe(createEncryptionStream({ key, format: 'v2' }))
    );

    expect(hasEncryptionFormatV2Magic(first)).toBe(true);
    expect(hasEncryptionFormatV2Magic(second)).toBe(true);
    expect(first.subarray(0, 26)).not.toEqual(second.subarray(0, 26));
    expect(first.subarray(26)).not.toEqual(second.subarray(26));
  });

  test('decrypts v2 exports when the header arrives in small chunks', async () => {
    const plaintext = 'chunked-header-export';
    const key = 'export-password';
    const encrypted = await collectStream(
      Readable.from([plaintext]).pipe(createEncryptionStream({ key, format: 'v2' }))
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

  test('supports piping through pipeline', async () => {
    const plaintext = 'pipeline-export';
    const key = 'export-password';
    const encryptedChunks: Buffer[] = [];
    const encryptedStream = createEncryptionStream({ key, format: 'v2' });

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
