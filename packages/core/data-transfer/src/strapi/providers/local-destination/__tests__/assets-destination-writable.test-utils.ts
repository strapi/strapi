import type { Writable } from 'stream';
import type { Core } from '@strapi/types';

import type { IAsset } from '../../../../types';

export const writeAsset = (stream: Writable, asset: IAsset) =>
  new Promise<void>((resolve, reject) => {
    stream.write(asset, (err) => (err ? reject(err) : resolve()));
  });

export const waitForUploadStream = (uploadStream: jest.Mock, timeoutMs = 500) =>
  new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const poll = () => {
      if (uploadStream.mock.calls.length > 0) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Timed out waiting for uploadStream'));
        return;
      }
      setImmediate(poll);
    };
    poll();
  });

/**
 * Mirrors path-keyed providers (AWS S3 keys objects as `path/hash.ext`, Cloudinary uses
 * `path` as the folder), including the provider metadata they return for the written object.
 */
export const pathAwareUploadStream = async (file: {
  hash: string;
  ext?: string;
  path?: string;
  url?: string;
  provider_metadata?: Record<string, unknown>;
}) => {
  const key = `${file.path ? `${file.path}/` : ''}${file.hash}${file.ext ?? ''}`;
  file.url = `/cdn/${key}`;
  file.provider_metadata = { key };
};

export const uploadedKeys = (uploadStream: jest.Mock) =>
  uploadStream.mock.calls.map(
    ([file]) => `${file.path ? `${file.path}/` : ''}${file.hash}${file.ext ?? ''}`
  );

export const createStrapiWithQuery = (
  uploadStream: jest.Mock,
  {
    findOne = jest.fn(),
    findMany = jest.fn().mockResolvedValue([]),
    update = jest.fn().mockResolvedValue(null),
  }: {
    findOne?: jest.Mock;
    findMany?: jest.Mock;
    update?: jest.Mock;
  } = {}
) =>
  ({
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
        findOne,
        findMany,
        update,
      })),
    },
    plugin(name: string) {
      if (name === 'upload') {
        return { provider: { uploadStream } };
      }
      return {};
    },
  }) as unknown as Core.Strapi;
