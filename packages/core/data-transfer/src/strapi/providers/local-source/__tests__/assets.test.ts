import { Readable } from 'stream';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Core } from '@strapi/types';

import { createAssetsStream, getFileStatsForTransfer } from '../assets';

const REMOTE_FILE_URL = 'https://cdn.example.com/file.pdf';
const REMOTE_FILE_CHUNKS = ['compressed response ', 'contents'];

describe('getFileStatsForTransfer', () => {
  test('uses the response body size when a remote response has no content-length header', async () => {
    const encoder = new TextEncoder();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          for (const chunk of REMOTE_FILE_CHUNKS) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      })
    );
    const arrayBufferSpy = jest.spyOn(response, 'arrayBuffer');
    const strapi = {
      fetch: jest.fn().mockResolvedValue(response),
    } as unknown as Core.Strapi;

    await expect(getFileStatsForTransfer(REMOTE_FILE_URL, strapi)).resolves.toEqual({
      size: Buffer.byteLength(REMOTE_FILE_CHUNKS.join('')),
    });
    expect(arrayBufferSpy).not.toHaveBeenCalled();
  });
});

describe('Local source assets stream warnings', () => {
  let publicDir: string;

  beforeEach(async () => {
    publicDir = await mkdtemp(join(tmpdir(), 'strapi-transfer-assets-'));
    await mkdir(join(publicDir, 'uploads'), { recursive: true });
  });

  afterEach(async () => {
    await rm(publicDir, { recursive: true, force: true });
  });

  test('reports warning callback when media DB row points to missing file', async () => {
    const missingFile = {
      id: 42,
      hash: 'missing-hash',
      ext: '.jpg',
      url: '/uploads/does-not-exist.jpg',
      provider: 'local',
      formats: undefined,
    };

    const warn = jest.fn();
    const strapi = {
      db: {
        queryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          stream: jest.fn(() => Readable.from([missingFile])),
        })),
      },
      dirs: {
        static: { public: publicDir },
      },
      log: {
        warn,
      },
      plugins: {
        upload: {
          provider: {
            isPrivate: jest.fn().mockResolvedValue(false),
          },
        },
      },
      config: {
        get: jest.fn(() => ({ provider: 'local' })),
      },
    } as any;

    const onWarning = jest.fn();
    const stream = createAssetsStream(strapi, { onWarning });

    const items: unknown[] = [];
    for await (const item of stream) {
      items.push(item);
    }

    expect(items).toHaveLength(0);
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining(
        'Media item 42 (hash: missing-hash) exists in database but no corresponding file was found to transfer'
      )
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Media item 42'));
  });

  test('does not include admin project-settings logos (only media-library files)', async () => {
    await writeFile(join(publicDir, 'uploads', 'media-hash.jpg'), Buffer.from('media'));

    const uploadFile = {
      id: 1,
      hash: 'media-hash',
      ext: '.jpg',
      url: '/uploads/media-hash.jpg',
      provider: 'local',
      formats: undefined,
    };

    const strapi = {
      db: {
        queryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          stream: jest.fn(() => Readable.from([uploadFile])),
        })),
      },
      dirs: {
        static: { public: publicDir },
      },
      log: { warn: jest.fn() },
      plugins: {
        upload: {
          provider: {
            isPrivate: jest.fn().mockResolvedValue(false),
          },
        },
      },
      config: {
        get: jest.fn(() => ({ provider: 'local' })),
      },
      store: () => ({
        get: jest.fn().mockResolvedValue({
          menuLogo: {
            hash: 'menu_logo',
            ext: '.png',
            url: '/uploads/menu_logo.png',
            provider: 'local',
          },
        }),
      }),
    } as any;

    const stream = createAssetsStream(strapi);
    const items: unknown[] = [];

    for await (const item of stream) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      filename: 'media-hash.jpg',
      metadata: expect.objectContaining({ id: 1 }),
    });
  });
});
