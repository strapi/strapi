import { Readable } from 'stream';
import type { Core } from '@strapi/types';

import type { IAsset } from '../../../../../types';
import { createTransaction } from '../../../../utils/transaction';
import { createAssetsDestinationWritable } from '../assets-destination-writable';

/**
 * Push may send start + chunks + end in one batch; `write()` must return before `uploadStream`
 * resolves so the PassThrough is not read-only until upload completes (avoids assets-step deadlock).
 */
describe('createAssetsDestinationWritable (push transfer regression)', () => {
  test('invokes write callback before uploadStream completes (PassThrough can be fed in the same batch)', async () => {
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

    const file: IAsset = {
      filename: 'a.jpg',
      filepath: '/a',
      stats: { size: 10 },
      stream: Readable.from([Buffer.from('hello')]),
      metadata: {
        hash: 'h',
        name: 'a',
        id: 1,
        url: 'a.jpg',
        size: 10,
        mime: 'image/jpeg',
      },
    };

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
                new Error(
                  'Timed out waiting for assets Writable write() callback (uploadStream must not block the write callback when start and chunks arrive in one batch)'
                )
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
