import { Readable } from 'stream';
import type { Core } from '@strapi/types';

import type { IAsset } from '../../../../../types';
import { createTransaction } from '../../../../utils/transaction';
import { createAssetsDestinationWritable } from '../assets-destination-writable';

/**
 * Push sends start + chunks + end in one batch; `write()` must return immediately so the
 * PassThrough can be fed in the same batch (avoids deadlock).  uploadStream is intentionally
 * deferred until the PassThrough ends — this ensures the provider receives a fully-populated
 * synchronous Readable instead of a lazy async wrapper (fixes Buffer.from(undefined) crashes
 * seen with certain upload providers when stream.read() is called before data is buffered).
 */
describe('createAssetsDestinationWritable (push transfer)', () => {
  test('write() callback fires immediately; uploadStream is called only after the PassThrough ends', async () => {
    let releaseUpload!: (value?: unknown) => void;
    const uploadBlocked = new Promise((resolve) => {
      releaseUpload = resolve;
    });

    let uploadFinished = false;
    const uploadStream = jest.fn(async () => {
      await uploadBlocked;
      uploadFinished = true;
    });

    const mockFindOne = jest.fn().mockResolvedValue({ id: 1, url: 'x.jpg', formats: {} });
    const mockUpdate = jest.fn().mockResolvedValue(null);

    const strapi = {
      config: {
        get(service: string) {
          if (service === 'plugin::upload') {
            return { provider: 'local' };
          }
          return {};
        },
      },
      db: {
        transaction(fn: (arg: { trx: object; rollback: () => Promise<void> }) => Promise<void>) {
          fn({ trx: {}, rollback: async () => Promise.resolve() });
          return Promise.resolve();
        },
        query: jest.fn(() => ({
          findOne: mockFindOne,
          update: mockUpdate,
        })),
      },
      plugin(name: string) {
        if (name === 'upload') {
          return {
            provider: { uploadStream },
          };
        }
        return {};
      },
    } as unknown as Core.Strapi;

    const transaction = createTransaction(strapi);

    const stream = createAssetsDestinationWritable({
      strapi,
      transaction,
      resolveUploadFileId: () => 1,
      restoreMediaEntitiesContent: false,
      removeAssetsBackup: async () => Promise.resolve(),
    });

    const assetStream = Readable.from([Buffer.from('hello')]);

    const file: IAsset = {
      filename: 'a.jpg',
      filepath: '/a',
      stats: { size: 10 },
      stream: assetStream,
      metadata: {
        hash: 'h',
        name: 'a',
        id: 1,
        url: 'a.jpg',
        size: 10,
        mime: 'image/jpeg',
      },
    };

    // write() must resolve quickly (no deadlock) even though the upload is blocked.
    const writeSettled = new Promise<void>((resolve, reject) => {
      stream.write(file, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        writeSettled,
        new Promise<void>((_, reject) => {
          timeoutId = setTimeout(
            () =>
              reject(
                new Error('Timed out: write() callback did not fire promptly — possible deadlock')
              ),
            200
          );
        }),
      ]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }

    // uploadStream is deferred until the PassThrough ends (async), so it may not have been
    // called at the exact moment the write callback fires. Yield to let pending microtasks
    // and stream events settle.
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(uploadStream).toHaveBeenCalled();
    expect(uploadFinished).toBe(false);

    releaseUpload();

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(uploadFinished).toBe(true);

    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    transaction.end();
  });
});
